
include: "*.view.lkml"

explore: history {
	join: user { sql_on: ${user.id} = ${history.user_id} ;; }
	
	#EAV
	#join: user_attribute {
	#		sql_on: ${users.id} = ${orders.user_id} ;;
	#		
	#}
}

explore: user_attribute {
	hidden: yes
}