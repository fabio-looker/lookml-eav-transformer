#! /usr/bin/env node
const generator = {name:"lookml-eav", v:"0.0.0", date:"2018-06-03"}
const cliArgs = require('minimist')(process.argv.slice(
		process.argv[0]=="lookml-eav"
		?1 //e.g. lookml-eav --bla
		:2 //e.g. node index.js --bla
	))
const fs = require("fs")
const path = require("path")
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
const apiClient = cliArgs.client || cliArgs.c
const apiSecret = cliArgs.secret || cliArgs.s
const apiToken = cliArgs.token || cliArgs.t
const directory = cliArgs.input || cliArgs.i || "."
const source = directory + "/*.{view,model}.lkml"

if(!host){console.warn("Warning: host (h) parameter is required to complete the process")}
if(!apiToken && !(apiClient && apiSecret)){
		console.warn("Warning: API credentials (client and secret, or token) are required to complete the process")
	}

!async function(){
try{
		const parsed = await lookmlParser.parseFiles({
				source, console
				,conditionalCommentString: "EAV"
			})
		console.log(parsed.file.view.user_attribute.view.user_attribute)
		if(parsed.errors){console.warn(...parse.errors)}
		const views = parsed.files.map(f=>f.views||[]).reduce(flatten,[])
		if(!views.length){
				if(directory=='.'){console.warn("Warning: No views were found in the current directory. Use --input=path/to/dir")}
				else{console.warn("Warning: No views were found in directory "+directory)}
				return
			}
		const eavViews = views.filter(v=>v.eav_attributes)
		if(!eavViews.length){
				console.warn("Warning: No views contain the eav_attributes property")
				return;
			}
		console.log(eavViews.map(view=>templates.base({view,generator})))
	}catch(e){
		console.error(e)
	}
}()