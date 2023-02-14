#!/usr/bin/sh
# change directory to the root of the project
cd ~/oji/oji
rm -rf *.apk
echo "Removing use of symlinks from shared folder"
sudo umount .meteor/local -f
rm .meteor/local -rf
mkdir -p .meteor/local
sudo umount packages -f
rm packages -rf
mkdir -p packages
mkdir -p "$HOME/.meteor/local"
sudo mount --bind "$HOME/.meteor/local" .meteor/local
mkdir -p "$HOME/.meteor/packages"
sudo mount --bind "$HOME/.meteor/packages" packages
meteor npm install --no-bin-links
export MONGO_URL=mongodb://localhost:27017/oji
echo "MONGO_URL=$MONGO_URL"
echo "Building Android APK"
meteor build ~/build --server=https://ojis-journey.com --mobile-settings=settings.json --packageType=apk --platforms=android --debug
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
# copy the debug apk to ~/oji/oji/public/debug.apk
cp app-debug.apk ~/deploy/debug.apk