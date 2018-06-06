view: user {
	sql_table_name: user ;;
	
	dimension: id {
		type: number
		primary_key: yes
	}
	dimension: email {}
	measure: count {
		type: count
	}
}