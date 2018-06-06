view: user_attribute {
	sql_table_name: user_attribute ;;
	# EAV
	#eav_attributes: {
	#	sql_table: ${SQL_TABLE_NAME} ;;
	#	sql_id: ${key} ;;
	#	sql_name: ${key} ;;
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