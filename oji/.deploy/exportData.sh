#!/bin/bash

# Run the mongoexport command inside the Docker container and save the output to a file
ssh -i  ~/oji/oji-staging.pem ubuntu@ojis-journey.com "docker exec mongodb mongoexport --db Oji --type csv --fields userId,moduleId,responses.pageId,responses.questionId,responses.response,responses.responseTimeStamp --out /tmp/output.csv --collection modresults"

#copy the output file from the Docker container to outside the container
ssh -i  ~/oji/oji-staging.pem  ubuntu@ojis-journey.com "docker cp mongodb:/tmp/output.csv /tmp/output.csv"

# Copy the output file from the Docker container to your local machine
scp -i  ~/oji/oji-staging.pem ubuntu@ojis-journey.com:/tmp/output.csv /tmp/output.csv

# Remove the output file from the Docker container
ssh -i  ~/oji/oji-staging.pem ubuntu@ojis-journey.com "docker exec mongodb $DOCKER_CONTAINER rm /tmp/output.csv"

# Print the CSV file to the terminal
column -t -s , $outputFilename
