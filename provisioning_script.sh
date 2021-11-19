#!/bin/bash

# Make a symbolic link to the sync'ed directory for more "natural" work
ln -s /vagrant "$HOME/cordova-testing"

# We will need to be able to compile some binary packages for Meteor
sudo apt-get update
sudo apt-get install -y build-essential
sudo apt-get install -y gcc
sudo apt-get install -y g++
sudo apt-get install -y make
sudo apt-get install -y automake
sudo apt-get install -y git
sudo apt-get install -y unzip

###############################################################################
# Install MongoDB


sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl enable mongodsudo apt-get install xfce4
sudo apt-get install dos2unix

# Change mongo to listen on all addresses (which is fine since we're walled off)
PDIR="$HOME/.provision"
mkdir -p "$PDIR"

CFGSRC="/etc/mongod.conf"
CFGBASE="$PDIR/mongod.conf"

cp $CFGSRC "$CFGBASE.old"
cat "$CFGBASE.old" \
 | sed "s/bind_ip: 127.0.0.1/bind_ip: 0.0.0.0/" \
 | sed "s/bindIp: 127.0.0.1/bindIp: 0.0.0.0/" \
 > "$CFGBASE.new"
sudo cp "$CFGBASE.new" $CFGSRC

# Now restart the service since we've changed the config
sudo systemctl restart mongod
###############################################################################

# Install Java 11
sudo apt install openjdk-8-jdk-headless 

# Install android tools 
mkdir ~/android
cd ~/android
wget https://dl.google.com/android/repository/commandlinetools-linux-7583922_latest.zip
unzip commandlinetools-linux-7583922_latest.zip
rm commandlinetools-linux-7583922_latest.zip
cd cmdline-tools
mkdir tools
mv ./* ~/android/cmdline-tools/tools/

#write bashrc
echo 'export ANDROID_HOME=$HOME/android' >> ~/.bashrc
echo 'export ANDROID_SDK_ROOT=$HOME/android' >> ~/.bashrc
echo 'export PATH=$ANDROID_HOME/cmdline-tools/tools/bin/:$PATH' >> ~/.bashrc
echo 'export PATH=$ANDROID_HOME/emulator/:$PATH'  >> ~/.bashrc
echo 'export PATH=$ANDROID_HOME/platform-tools/:$PATH' >> ~/.bashrc
echo 'export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64' >> ~/.bashrc

#export bash vars
export ANDROID_HOME=$HOME/android
export ANDROID_SDK_ROOT=$HOME/android
export PATH=$ANDROID_HOME/cmdline-tools/tools/bin/:$PATH
export PATH=$ANDROID_HOME/emulator/:$PATH
export PATH=$ANDROID_HOME/platform-tools/:$PATH
export JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64

#install node and nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
nvm install 14
nvm use 14

#Install meteor
curl https://install.meteor.com/?release=2.5.1 | sh

#meteor update
meteor npm install --save babel-runtime --no-bin-links

#Install gradle
sudo apt-get install -y gradle

# Remove Ubuntu's landscape stuff and clear login messages
sudo apt-get purge -y landscape-client landscape-common
sudo rm -f /etc/update-motd/*
sudo rm -f /etc/motd
sudo touch /etc/motd

# Spit out some messages for the user - to do this we'll need to create a message
# of the day (motd) file, and change the sshd_config file
cat << EOF | sudo tee /etc/motd

==============================================================================
Some helpful hints for working with meteor-based cordova apps:

 * You can use your favorite code editor and version control application in
   the host operating system - you can just use this little login to start,
   stop, or restart the cordova application

 * The provided meteor script (run_meteor above) insures that cordova apps use
   the correct Mongo instance installed in this virtual machine. To access the
   Mongo data from your host operating system (for instance, with RoboMongo)
   you should connect to IP address 127.0.0.1 and port 30017
   
  * You need to run the following on first run:
   sdkmanager "platforms;android-30" "build-tools;30.0.3" "emulator"
   

==============================================================================

EOF

SSHDSRC="/etc/ssh/sshd_config"
SSHDBASE="$PDIR/sshd_config"

# Note that below we set the SSH variable PrintMotd to no - which is odd because
# that's exactly what we want to happen. However, Ubuntu configures a PAM motd
# module that will print the motd file on login. If we don't set the sshd config
# variable PrintMotd to no, our message would be displayed twice

cp "$SSHDSRC" "$SSHDBASE.old"
grep -v PrintMotd "$SSHDBASE.old" > "$SSHDBASE.new"
printf "\n\nPrintMotd no\n" >> "$SSHDBASE.new"
sudo cp "$SSHDBASE.new" "$SSHDSRC"
