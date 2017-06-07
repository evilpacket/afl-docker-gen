var fs = require('fs');

var docker = function(config){
this.config=config;

}

var defaults = {
	afl_version: "2.41b",
	node_version: "v7.10.0",
	llvm_version: "3.6",
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




docker.prototype.fileGen = function(){

var config = this.config;

var v8_opts = "";
config.v8_opts.forEach(
	function(opt, i){
		v8_opts += "\"" + opt + "\""
		v8_opts += (i+1<config.v8_opts.length)? ", " : "";
	});
console.log(v8_opts);



var content  = `
FROM ubuntu:latest
MAINTAINER Jon Lamendola <jonl@andyet.net>

# Set Environment Vars
# Probably not needed? leaving out for now. ENV PROG afl-fuzz
ENV NODE_URL https://nodejs.org/dist/${config.node_version}/node-${config.node_version}.tar.gz
ENV AFL_URL http://lcamtuf.coredump.cx/afl/releases/afl-${config.afl_version}.tgz
ENV NODE_PREFIX /opt/node
ENV FUZZ_ROOT /var/fuzz
ENV FUZZ_OUTPUT /var/fuzz/output
ENV FUZZ_CORPUS /var/fuzz/input
ENV TEST_HARNESS /var/fuzz/harness.js
RUN mkdir -p $FUZZ_OUTPUT/queue
RUN mkdir -p $FUZZ_OUTPUT/hangs
RUN mkdir -p $FUZZ_OUTPUT/crashes
RUN mkdir -p $FUZZ_CORPUS

VOLUME $FUZZ_OUTPUT/crashes $FUZZ_OUTPUT/hangs

RUN apt-get update --quiet -y && apt-get install -y apt-utils clang-${config.llvm_version} libclang-common-${config.llvm_version}-dev clang-format-${config.llvm_version} ${(config.sys_deps && config.sys_deps instanceof Array)? config.sys_deps.join(" "): ""}

RUN update-alternatives --install \\
        /usr/bin/llvm-config       llvm-config      /usr/bin/llvm-config-${config.llvm_version}  200 \t\\
--slave /usr/bin/llvm-ar           llvm-ar          /usr/bin/llvm-ar-${config.llvm_version} \\
--slave /usr/bin/llvm-as           llvm-as          /usr/bin/llvm-as-${config.llvm_version} \\
--slave /usr/bin/llvm-bcanalyzer   llvm-bcanalyzer  /usr/bin/llvm-bcanalyzer-${config.llvm_version} \\
--slave /usr/bin/llvm-cov          llvm-cov         /usr/bin/llvm-cov-${config.llvm_version} \\
--slave /usr/bin/llvm-diff         llvm-diff        /usr/bin/llvm-diff-${config.llvm_version} \\
--slave /usr/bin/llvm-dis          llvm-dis         /usr/bin/llvm-dis-${config.llvm_version} \\
--slave /usr/bin/llvm-dwarfdump    llvm-dwarfdump   /usr/bin/llvm-dwarfdump-${config.llvm_version} \\
--slave /usr/bin/llvm-extract      llvm-extract     /usr/bin/llvm-extract-${config.llvm_version} \\
--slave /usr/bin/llvm-link         llvm-link        /usr/bin/llvm-link-${config.llvm_version} \\
--slave /usr/bin/llvm-mc           llvm-mc          /usr/bin/llvm-mc-${config.llvm_version} \\
--slave /usr/bin/llvm-mcmarkup     llvm-mcmarkup    /usr/bin/llvm-mcmarkup-${config.llvm_version} \\
--slave /usr/bin/llvm-nm           llvm-nm          /usr/bin/llvm-nm-${config.llvm_version} \\
--slave /usr/bin/llvm-objdump      llvm-objdump     /usr/bin/llvm-objdump-${config.llvm_version} \\
--slave /usr/bin/llvm-ranlib       llvm-ranlib      /usr/bin/llvm-ranlib-${config.llvm_version} \\
--slave /usr/bin/llvm-readobj      llvm-readobj     /usr/bin/llvm-readobj-${config.llvm_version} \\
--slave /usr/bin/llvm-rtdyld       llvm-rtdyld      /usr/bin/llvm-rtdyld-${config.llvm_version} \\
--slave /usr/bin/llvm-size         llvm-size        /usr/bin/llvm-size-${config.llvm_version} \\
--slave /usr/bin/llvm-stress       llvm-stress      /usr/bin/llvm-stress-${config.llvm_version} \\
--slave /usr/bin/llvm-symbolizer   llvm-symbolizer  /usr/bin/llvm-symbolizer-${config.llvm_version} \\
--slave /usr/bin/llvm-tblgen       llvm-tblgen      /usr/bin/llvm-tblgen-${config.llvm_version} 

RUN update-alternatives \
      --install /usr/bin/clang   clang   /usr/bin/clang-${config.llvm_version}     50 \\
      --slave   /usr/bin/clang++ clang++ /usr/bin/clang++-${config.llvm_version}  \\
      --slave   /usr/bin/lldb    lldb    /usr/bin/lldb-${config.llvm_version} \\
      --slave   /usr/bin/lldb-server lldb-server /usr/bin/lldb-server-${config.llvm_version}



# Get sources
WORKDIR /usr/src/
ADD $AFL_URL afl.tgz
RUN tar -xzf afl.tgz 

# Build afl-fuzz
WORKDIR /usr/src/afl-${config.afl_version}
RUN make && make install

WORKDIR $NODE_PREFIX

# Download and build node.js
ADD $NODE_URL node.tar.gz

RUN tar xfz node.tar.gz \
  && cd node-${config.node_version} \\
  && AFL_HARDEN=${config.afl_harden +0} AFL_INST_RATIO=${config.afl_inst_ratio} CC=/usr/local/bin/${config.afl_CC} CXX=/usr/local/bin/${config.afl_CXX} ./configure \\
  && make \\
  && make install

WORKDIR $FUZZ_ROOT

COPY ${config.test_harness} $TEST_HARNESS
COPY ${config.test_corpus}/* $FUZZ_CORPUS/
COPY fuzz.sh ./fuzz.sh
RUN chmod +x ./fuzz.sh
RUN mkdir ./node_modules
RUN AFL_HARDEN=${config.afl_harden + 0} AFL_INST_RATIO=${config.afl_target_inst_ratio} CC=/usr/local/bin/${config.afl_CC} CXX=/usr/local/bin/${config.afl_CXX} npm i ${config.target_module}



CMD ["/var/fuzz/fuzz.sh", "/usr/local/bin/afl-fuzz", "-i", "/var/fuzz/input", "-o", "/var/fuzz/output", "-m", "${config.afl_memory_limit}", "node", ${v8_opts}, "--", "/var/fuzz/harness.js", ${(config.harness_use_stdin? "" : "\"@@\"")}]
`

this.dockerFile = content;
return content;
}


docker.prototype.build = function(){
	var config = this.config;

	var buildCommand = "docker run --tmpfs /var/fuzz/output/queue:rw,noexec,nosuid,size=262144k";


}
var cfg = (process.argv[2])? JSON.parse(fs.readFileSync(process.argv[2]).toString('utf8')) : defaults;

var generated = new docker(cfg);

fs.writeFileSync("./build/Dockerfile", generated.fileGen());


