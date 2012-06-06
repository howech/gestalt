# Examples

- args_example.js

 A short sample for using ConfigArgs

- central.yaml

 Configuration file for the cluster example

- cluster.js

 Cluster example. You need a running zookeeper server for it to
 work. The zookeeper server in central.yaml probably does not work,
 but you can override it at the command line or in an environment
 variable. (-z zk://localhost:2181 will probably work if you have an
 out of the box zookeeper install). For the best effect, run
 cluster.js in several different processes, and try changing the value
 of the cluster name in the config file while they are running, start
 and stop the zookeeper servers, etc. Also, if you hit ctrl-c once
 while cluster is running, it will print out a report of its
 configuration. If you hit ctrl-c twice quickly, it will gracefully
 shut down the cluster node.

- complicated-example.js
 
 An example that pulls several concepts together from other examples.

- config.yaml
  
 Config file uset in file_example and complicated-example

- container-example.js

 An example showcasing some of the interesting stuff that config
 containers can do.

- env_example.js

 A short example showing ConfigEnv

- file_example.js
 
 A short example showing ConfigFile

- patt.js

 An example of some pattern listeners.

- README.md

 This File

- remap-example.js

 An example showing how the RemapConfig Object works.

- zookeeper_election.js

 A zookeeper example, but not as sophisticated as cluster.
