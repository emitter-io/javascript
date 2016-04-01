module.exports = function(grunt){
	
	// Project configuration. 
	grunt.initConfig({
		concat: {
			js: {
				src: ['lib/mqttws31.js', 'lib/emitter.js'],
				dest: 'build/emitter.js',
			}
		},
		
		uglify: {
			options: { mangle: false },
			js: {
				files: { 'build/emitter.min.js': ['build/emitter.js'] }
			}
		},
		
		watch: {
			scripts: {
				files: ['lib/*.js'],
				tasks: ['default'],
				options: { spawn: false },
			},
		},
	});
		
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	
	grunt.registerTask('default', ['concat', 'uglify']);
	
	
};