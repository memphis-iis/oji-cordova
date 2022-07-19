#!/bin/sh

cd ~/oji
mongodump
tar czf dump.tar.gz dump/
rm -rf dump/