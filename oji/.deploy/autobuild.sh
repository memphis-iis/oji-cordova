#!/usr/bin/sh
# change directory to the root of the project
cd ~/oji/oji
echo "Meteor Kung-Fu"
sudo umount .meteor/local -f
rm .meteor/local -rf
mkdir -p .meteor/local
rm -rf node_modules
rm -rf ~/node_modules
mkdir ~/node_modules
ln -s ~/node_modules
# meteor add firebased/app
echo "Installing Node Modules"
npm install
meteor npm install
# change directory to the root/.deploy of the project
cd ~/oji/oji/.deploy
echo "Building Android APK"
meteor build ~/build --server https://ojis-journey.com:443 --mobile-settings settings.json
# Copy the apk to this directory
cp ~/.meteor/local/cordova-build/platforms/android/app/build/outputs/apk/release/app-release-unsigned.apk .
# build a key store
echo "Building Key Store"
keytool -genkey -v -keystore ojis-journey.keystore -alias ojis-journey -keyalg RSA -keysize 2048 -validity 10000
# sign the apk
echo "Signing APK"
apksigner sign --ks ojis-journey.keystore app-release-unsigned.apk
# copy the signed apk to ~/oji/oji/public/release.apk
rm -rf ~/deploy/release.apk
mkdir -p ~/deploy
cp app-release-unsigned.apk ~/deploy/release.apk