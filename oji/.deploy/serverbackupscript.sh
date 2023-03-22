#!/bin/bash
#delete all docker containers that are not running
echo "Removing all docker containers that are not running"
docker system prune -a -f
#copy the backup from ~/
echo "Copying backup from ~/"
docker cp ~/mongodump.gz mongodb:/root/mongodump.gz
#use docker to restore the mongo database
echo "Restoring mongo"
docker exec -it mongodb mongorestore --archive=/root/mongodump.gz --gzip
#wait for user input
echo "Press enter to continue to destroy the old server or Ctrl+C to cancel"
read -p "Press enter to continue"
#use docker to backup the mongo database
echo "Backing up mongo"
docker exec -it mongodb mongodump --archive=/root/mongodump.gz --gzip
#copy the backup to ~/
echo "Copying backup to ~/"
docker cp mongodb:/root/mongodump.gz ~/
#delete mongo
echo "Removing old mongo"
sudo rm -rf /var/lib/mongodb
sudo rm -rf /opt/mongodb

