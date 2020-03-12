view: user_attribute {
	sql_table_name: user_attribute ;;
	#EAV
	#eav: {
	#	attribute_explore: user_attribute
	#	attribute_id: user_attribute.key
	#	attribute_name: user_attribute.key
	#}
	
	
	dimension: id {
		type: number
		primary_key: yes
		hidden: yes
	}
	
	dimension: user_id {
		type: number
		hidden: yes
	}
	dimension: key {}
	dimension: value {}
}