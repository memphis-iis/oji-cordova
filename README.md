# cordova-testing
testing meteor cordova

# requirements
Java JDK version 8 (sudo apt-get install openjdk-8-jre)<br>
Android SDK (sudo snap install androidsdk)<br>
Gradle (sudo apt-get install gradle)

# dev enviorment setup
meteor add-platform android<br>
meteor add-platform ios

## Add enviorment vars to ~/.bashrc
export ANDROID_SDK_ROOT=/yourAndroidStudioPath/Android<br>
export PATH=${PATH}:$ANDROID_SDK_ROOT/tools:$ANDROID_SDK_ROOT/platform-tools<br>
export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64<br>
export JRE_HOME=/usr/lib/jvm/java-8-openjdk-amd64/jre<br>
export PATH=$PATH:/opt/gradle/gradle-6.1.1/bin<br>
export ANDROID_HOME=/home/ubuntu/tools/android<br>
export PATH=$PATH:$ANDROID_HOME/bin<br>
export PATH=/home/ubuntu/tools:/home/ubuntu/tools/bin:$PATH<br>
