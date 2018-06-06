view: history {
	sql_table_name: history ;;
	
	dimension: id {
		type: number
		hidden: yes
		primary_key: yes
	}
	dimension: user_id {
		type: number
		hidden: yes
	}
	dimension_group: created {
		type: time
		sql: ${TABLE}.created_at ;;
	}
	measure: count {
		type: count
	}
}