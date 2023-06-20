# -*- mode: ruby -*-
# vi: set ft=ruby :

cordova_gid=1002

# All Vagrant configuration is done below. The "2" in Vagrant.configure
# configures the configuration version (we support older styles for
# backwards compatibility). Please don't change it unless you know what
# you're doing.
Vagrant.configure(2) do |config|
  config.vm.box = "ubuntu/focal64"
  config.vm.network "forwarded_port", guest: 27017, host: 30017, host_ip: "127.0.0.1"
  config.vm.network "forwarded_port", guest: 5432, host: 65432
  config.vm.network "forwarded_port", guest: 3000, host: 3000, host_ip: "0.0.0.0"
  config.vm.boot_timeout = 1800
  config.vm.provider "virtualbox" do |vb|
    vb.gui = false
    vb.memory = "6144"
    vb.cpus = 2
  end
  config.vm.provision "shell", privileged: false, path: "provisioning_script.sh"
end
