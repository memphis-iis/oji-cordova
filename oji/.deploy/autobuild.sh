#!/usr/bin/sh
#deploy using mup
#mup deploy
# remove all apk files in the root of the project
rm -rf ./*.apk
# change directory to the root of the project
cd ~/oji/oji
echo "Building Android APK"
meteor build ~/build --server=http://ojis-journey.com --mobile-settings=settings.json --packageType=apk --platforms=android --verbose
cp ~/.meteor/local/cordova-build/platforms/android/app/build/outputs/apk/debug/app-debug.apk ./
# sign the apk
echo "Signing APK"
apksigner sign --ks ojis-journey.keystore app-s
# copy the signed apk to ~/oji/oji/public/release.apk
rm -rf ~/deploy/release.apk
mkdir -p ~/deploy
cp app-debug.apk ~/deploy/debug.apk
#copy the signed apk to ~/oji/oji/public/release - unix timestamp
cp app-debug.apk ~/deploy/release-$(date +%s).apk
