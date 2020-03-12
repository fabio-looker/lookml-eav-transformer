#! /usr/bin/env node
const generator = {name:"lookml-eav", v:"0.0.0", date:"2018-06-03"}
const cliArgs = require('minimist')(process.argv.slice(
		process.argv[0]=="lookml-eav"
		?1 //e.g. lookml-eav --bla
		:2 //e.g. node index.js --bla
	))
const fs = require("fs")
const path = require("path")
const rp = require("request-promise")
const lookmlParser = require('lookml-parser')
const read = f => fs.readFileSync(f,{encoding:'utf-8'})

const dot = require("dot")
dot.templateSettings = {
		evaluate:    /\<\<\!([\s\S]+?)\>\>/g,
		interpolate: /\<\<\:([\s\S]+?)\>\>/g,
		encode:      /\<\<&([\s\S]+?)\>\>/g,
		use:         /\<\<#([\s\S]+?)\>\>/g,
		define:      /\<\<##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\>\>/g,
		conditional: /\<\<\?(\?)?\s*([\s\S]*?)\s*\>\>/g,
		iterate:     /\<\<\*\s*(?:\>\>|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\>\>)/g,
		varname: 'x',
		strip: false,
		append: true,
		selfcontained: false
	};
const templates = {
		base: dot.template(read(path.join(__dirname,"eav-base.dot"))),
		meta: dot.template(read(path.join(__dirname,"eav-meta.dot"))),
		models: dot.template(read(path.join(__dirname,"eav-models.dot")))
	}
const flatten = (a,b) => a.concat(b)
const host = cliArgs.host || cliArgs.h
const client_id = cliArgs.client || cliArgs.c
var client_secret = cliArgs.secret || cliArgs.s
var access_token = cliArgs.token || cliArgs.t
const directory = cliArgs.input || cliArgs.i || "."
const source = directory + "/*.{view,model}.lkml"
const readline = require('readline')
const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})

!async function(){
try{
		if(!host){console.warn("'host' (h) parameter is required"); return}
		const hostParts = host.match(/^(https?:\/\/)?([^#?:\/]+?)(:[0-0]{1,5})?$/)
		const origin = (hostParts[1]||"https://")+hostParts[2]+(hostParts[3]||":19999")
		
		if(!access_token && client_id){
				if(!client_secret){
						client_secret = await (new Promise(function(resolve, reject) {
								rl.question('Enter your client secret: ', answer => {
										rl.close()
										resolve(answer)
									})
							}))
					}
				console.log("Authenticating against "+host+"...")
				try{
				const auth = await rp({
						method: 'POST',
						uri: origin+"/login",
						form: {client_id,client_secret},
						//body: {client_id,client_secret},
						json: true
					})
				if(auth.access_token){
						console.log("	...authentication successful")
						access_token = auth.access_token
					}else{
						console.error(auth)
						return
					}
				}catch(e){console.error(e); return;}
			}
		if(!access_token){
				console.warn("API credentials are required. Provide 'client' (c) or 'token' (t)")
				return
			}
		const api = async (endpoint,data,opts) => {
				var [,,method,path] = endpoint.match(/^((GET|POST) )?(.*)$/)
				return await rp({
						method: method||"GET",
						uri: origin+"/api/3.0"+path,
						[method=="GET"?"qs":"body"]: data,
						...opts,
						headers: {
								Authorization: "Bearer "+access_token,
								...(opts||{}).headers
							},
						json: true
					})
			}
		const project = await lookmlParser.parseFiles({
				source, console
				,conditionalCommentString: "EAV"
			})
		if(project.error){console.error(project.error);return;}
		if(project.errors){project.errorReport ? console.warn(project.errorReport()):console.warn(project.errors)}
		const views = project.files.map(f=>f.views||[]).reduce(flatten,[])
		if(!views.length){
				if(directory=='.'){console.warn("No views were found in the current directory. Use --input=path/to/dir")}
				else{console.warn("No views were found in directory "+directory)}
				return
			}
		if(!views.filter(v=>v.eav).length){
				console.warn("No views contain the 'eav' property")
				return
			}


		for (model of project.models){
			let eavViews = model.views && model.views.filter(v=>v.eav)
				for (let view of eavViews){
						console.log("Processing "+model._model+"::"+view._view)
						if(!view.eav.attribute_explore){console.warn("  > eav requires parameter 'attribute_explore'");continue;}
						if(!view.eav.attribute_id){console.warn("  > eav requires parameter 'attribute_id_dimension'");continue;}
						if(!view.eav.entity_view){console.warn("  > eav requires parameter 'entity_view'");continue;}
						let data = await tryTo(() => api("POST /queries/run/json", {
								model: model._model,
								view: view.eav.attribute_explore,
								fields: [
										view.eav.attribute_id_dimension,
										view.eav.attribute_name_dimension,
										view.eav.owner_id_dimension,
										view.eav.owner_name_dimension
									].filter(Boolean),
								sorts: [
										view.eav.owner_id_dimension,
										view.eav.owner_name_dimension
									].filter(Boolean),
								limit:5000
							}),e=>console.error(e.error && e.error.message || e.message || "Error"))
						if(!data){continue}
						if(data.length==5000){console.warn("Warning: 5000-row limit reached")}
						console.log(data.slice(4))
						perOwner = data.map(row => ({
								owner_id: ''+(x[view.eav.owner_id_dimension]||null),
								owner_name: x[view.eav.owner_name_dimension]||x[view.eav.owner_name_dimension]||'',
								attribute_id: ''+(x[view.eav.attribute_id_dimension]||null),
								attribute_name: ''+(x[view.eav.attribute_name_dimension]||x[view.eav.attribute_id_dimension]||null)
							})).reduce((idx,row)=>({
										...idx,
										[row.owner_id]:{
												id: row.owner_id
												name: row.owner_name
												attributes: [
														...((idx[row.owner_id]||{}).attributes||[]),
														...[{id:row.attribute_id,name:row.attribute_name}]
													]
											}
								})
						for( let owner of Object.values(perOwner) ) {
								console.log("explore: "+owner.name+"_"+view._view+"_eav { from:"+eav.entity_view+"}")
							}
					}
			}
	}catch(e){
		console.error(e.errorReport?e.errorReport():e)
	}
}()

function tryTo(fn,efn){try{return fn()}catch(e){efn&&efn(e)}}
