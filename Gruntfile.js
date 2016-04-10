module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  grunt.loadNpmTasks('grunt-execute');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.initConfig({

    clean: ["dist"],

    copy: {
      src_to_dist: {
        cwd: 'src',
        expand: true,
        src: ['**/*', '!**/*.js', '!**/*.scss'],
        dest: 'dist'
      },
      pluginDef: {
        expand: true,
        src: ['plugin.json', 'README.md'],
        dest: 'dist',
      }
    },

    watch: {
      rebuild_all: {
        files: ['src/**/*', 'plugin.json', 'README.md'],
        tasks: ['default'],
        options: {spawn: false}
      },
    },

    karma: {
      dev: {
        configFile: 'karma.conf.js',
        singleRun: false,
      },
      debug: {
        configFile: 'karma.conf.js',
        singleRun: false,
        browsers: ['Chrome']
      },
    },

    babel: {
      options: {
        sourceMap: true,
        presets:  ["es2015"],
        plugins: ['transform-es2015-modules-systemjs', "transform-es2015-for-of"],
      },
      dist: {
        files: [{
          cwd: 'src',
          expand: true,
          src: ['**/*.js', '!src/directives/*.js', '!src/filters/*.js'],
          dest: 'dist',
          ext:'.js'
        }]
      },
    },

    sass: {
      options: {
        sourceMap: true
      },
      dist: {
        files: {
          "dist/css/worldping.dark.css": "src/sass/worldping.dark.scss",
          "dist/css/worldping.light.css": "src/sass/worldping.light.scss",
        }
      }
    }
  });

  grunt.registerTask('default', ['clean', 'sass', 'copy:src_to_dist', 'copy:pluginDef', 'babel']);
};
