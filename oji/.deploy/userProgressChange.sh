#!/bin/bash

# Prompt the user for input
read -p "Enter the first name of the user: " firstname
read -p "Enter the last name of the user: " lastname
read -p "Enter the title of the module: " moduleTitle
read -p "Enter the new page ID: " pageId
read -p "Enter the new question ID: " questionId

# Connect to the MongoDB database in the Docker container on the remote server
ssh -i ~/oji/oji-staging.pem ubuntu@ojis-journey "docker exec mongodb mongo yourAppName"

# Search for the module by title and get the ID
moduleId=$(ssh -i ~/oji/oji-staging.pem ubuntu@ojis-journey "docker exec mongodb mongo yourAppName --eval 'db.modules.findOne({ title: \"$moduleTitle\" }, { _id: 1 })' --quiet" | awk 'NR==2{print $3}')

# Update the user's curModule and curAssignment fields
echo "Updating user: $firstname $lastname"
echo "New curModule fields: moduleId=$moduleId, pageId=$pageId, questionId=$questionId"
ssh -i ~/oji/oji-staging.pem ubuntu@ojis-journey "docker exec mongodb mongo yourAppName --eval 'db.users.updateOne({ firstname: \"$firstname\", lastname: \"$lastname\" }, { \$set: { \"curModule.moduleId\": \"$moduleId\", \"curModule.pageId\": \"$pageId\", \"curModule.questionId\": \"$questionId\", \"curAssignment.id\": \"$moduleId\" } })'"
