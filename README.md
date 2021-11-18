# cordova-testing
testing meteor cordova

# requirements
Java JDK version 8 (sudo apt-get install openjdk-8-jre)<br>
Android SDK (sudo add-apt-repository ppa:maarten-fonville/android-studio, sudo apt update, sudo apt install android-studio)<br>

# dev enviorment setup
## Add enviorment vars to ~/.bashrc
export ANDROID_SDK_ROOT=/yourAndroidStudioPath/Android
export PATH=${PATH}:$ANDROID_SDK_ROOT/tools:$ANDROID_SDK_ROOT/platform-tools
export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64
export JRE_HOME=/usr/lib/jvm/java-8-openjdk-amd64/jre
export PATH=$PATH:/opt/gradle/gradle-6.1.1/bin
export ANDROID_HOME=/home/ubuntu/tools/android
export PATH=$PATH:$ANDROID_HOME/bin
export PATH=/home/ubuntu/tools:/home/ubuntu/tools/bin:$PATH
