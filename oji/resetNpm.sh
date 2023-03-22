sudo umount .meteor/local -f
rm .meteor/local -rf
mkdir -p .meteor/local
rm -rf node_modules
mkdir ~/node_modules
ln -s ~/node_modules
npm install