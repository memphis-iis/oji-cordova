# cordova-testing
testing meteor cordova

# Use the vagrant script to install for headless development
vagrant up

# For mobile testing, you must install a display manager on vagrant. Not requrired for web testing.
LXDE: sudo apt-get install lxde
XFCE4: sudo apt-get install xfce4
X Terminal: sudo apt-get install xinit

# requirements
Java JDK version 8 (sudo apt-get install openjdk-8-jre)<br>
Android SDK (sudo apt update && sudo apt install android-sdk)<br>
Gradle (sudo apt-get install gradle)

# dev enviorment setup
meteor add-platform android<br>
meteor add-platform ios

## Add enviorment vars to ~/.bashrc (requires bash restart)
export ANDROID_SDK_ROOT=/usr/lib/android-sdk<br>
export PATH=${PATH}:$ANDROID_SDK_ROOT/tools:$ANDROID_SDK_ROOT/platform-tools<br>
export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64<br>
export JRE_HOME=/usr/lib/jvm/java-8-openjdk-amd64/jre<br>
export PATH=$PATH:/opt/gradle/gradle-6.1.1/bin<br>
export ANDROID_HOME=/usr/lib/android-sdk<br>
export PATH=$PATH:$ANDROID_HOME/bin<br>
export PATH=/home/ubuntu/tools:/home/ubuntu/tools/bin:$PATH<br>
