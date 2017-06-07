# afl-docker-gen

A simple script intended to generate a Dockerfile that takes care of most of the basic boilerplate needed to get a fuzzing run started.
In most cases, it will still require some small amount of setup outside of the Dockerfile, and familiarity with Docker to get it running.
However, the commands in the generated Dockerfile can easily be run in a standard Debian/Ubuntu VM to the same effect.


## Usage:

Either use the default options, or pass in a configuration.json file as the first argument to the program, as follows:

```
node index.js ./configuration.json
```

This is the default configuration, which is also the format the tool expects when passing in a configuration:

```
{
	afl_version: "2.41b",
	node_version: "v7.10.0",
	llvm_version: "3.7",
	sys_deps:[
		"autoconf",
		"automake",
		"gcc",
		"g++",
		"libtool",
		"nasm",
		"subversion",
		"wget",
		"python",
		"make",
		"libtool-bin",
		"wget",
		"python",
		"automake",
		"bison",
		"libglib2.0",
		"git",
		"libssl-dev"
	],
	afl_inst_ratio: "75",
	afl_target_inst_ratio: "100",
	afl_harden: true,
	afl_memory_limit: "900",
	afl_CC: "afl-gcc",
	afl_CXX: "afl-g++",
	v8_opts: [
		"--turbo",
		"--ignition",
		"--stack_trace_limit=3",
		"--stack_size=512",
		"--predictable",
		"--hard_abort",
	],
	target_module: "bcrypt",
	test_harness: "./bcrypt_harness.js",
	test_corpus: "./bcrypt_corpus",
	harness_use_stdin: false,
};
```


One thing that must be done before running the fuzzer is that you need to login to the docker image with the --privileged flag and edit the core dumps pattern with the following commmand:
```
echo core >/proc/sys/kernel/core_pattern
```

Because of the way Docker works, there is no way to set this via the Dockerfile.


