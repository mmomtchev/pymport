{
  'variables': {
    'enable_asan%': 'false',
    'enable_coverage%': 'false',
    'builtin_python%': 'false',
    'external_python%': 'false',
    'binding_dir': '<!(node -e "console.log(path.dirname(require(\'@mapbox/node-pre-gyp\').find(\'package.json\')))")',
  },
  'targets': [
    {
      'target_name': 'pymport',
      'sources': [ 
        'src/main.cc',
        'src/pyobj.cc',
        'src/call.cc',
        'src/fromjs.cc',
        'src/tojs.cc',
        'src/objstore.cc',
        'src/memview.cc',
        'src/async.cc'
      ],
      'include_dirs': [
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      'defines': [
        'NODE_ADDON_API_DISABLE_DEPRECATED',
        'NAPI_VERSION=8',
        'PYMPORT_VERSION_MAJOR=<!(node -e "console.log(require(\'./package.json\').version.split(\'.\')[0])")',
        'PYMPORT_VERSION_MINOR=<!(node -e "console.log(require(\'./package.json\').version.split(\'.\')[1])")',
        'PYMPORT_VERSION_PATCH=<!(node -e "console.log(require(\'./package.json\').version.split(\'-\')[0].split(\'.\')[2])")',
        'PYMPORT_VERSION_SUFFIX=<!(node -e "console.log(require(\'./package.json\').version.split(\'-\')[1] || \'\')")'
      ],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      'conditions': [
        ['enable_asan == "true"', {
          'cflags_cc': [ '-fsanitize=address' ],
          'ldflags' : [ '-fsanitize=address' ],
          'xcode_settings': {
            'OTHER_CPLUSPLUSFLAGS': [ '-fsanitize=address' ],
            'OTHER_LDFLAGS': [ '-fsanitize=address' ]
          }
        }],
        ['enable_coverage == "true"', {
          'cflags_cc': [ '-fprofile-arcs', '-ftest-coverage' ],
          'ldflags' : [ '-lgcov', '--coverage' ]
        }],
        ['builtin_python == "true"', {
          'defines': [ 'BUILTIN_PYTHON_PATH=LR"(<(binding_dir))"' ]
        }],
        ['OS == "win"', {
          'msvs_settings': {
            'VCCLCompilerTool': { 
              'ExceptionHandling': 1,
              'AdditionalOptions': [' /std:c++14' ]
            },
          },
          'conditions': [
            ['builtin_python == "false" and external_python == "false"', {
              'include_dirs': [ '<!(python -c "import os, sys; print(os.path.dirname(sys.executable))")/include' ],
              'msvs_settings': {
                'VCLinkerTool': {
                  'AdditionalLibraryDirectories': '<!(python -c "import os, sys; print(os.path.dirname(sys.executable))")/libs'
                }
              },
            }],
            ['builtin_python == "true"', {
              'dependencies': [ 'builtin_python' ],
              'include_dirs': [ 'build\Python-$(BUILTIN_PYTHON_VERSION)\Include', 'build\Python-$(BUILTIN_PYTHON_VERSION)\PC' ],
              'msvs_settings': {
                'VCLinkerTool': {
                  'AdditionalLibraryDirectories': '<(module_path)'
                }
              },
            }]]
        }],
        ['OS != "win"', {
          'conditions': [
            ['builtin_python == "false" and external_python == "false"', {
              'cflags': [ '<!@(pkg-config --cflags python3-embed)' ],
              'libraries': [ '<!@(pkg-config --libs python3-embed)' ],
              'xcode_settings': {
                'OTHER_CPLUSPLUSFLAGS': [ '<!@(pkg-config --cflags python3-embed)' ],
              }
            }],
            ['builtin_python == "false" and external_python == "true"', {
              'libraries': [ '<!(echo $LIBS)' ]
            }],
            ['builtin_python == "true"', {
              'dependencies': [ 'builtin_python' ],
              'include_dirs': [ '<(module_path)/include/python3.12' ],
              'libraries': [ '-L<(module_path)/lib/ -lpython3.12' ],
              'ldflags': [ '-Wl,-z,origin', '-Wl,-rpath,\'$$ORIGIN/lib\'' ]
            }]
          ],
          'xcode_settings': {
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'CLANG_CXX_LIBRARY': 'libc++',
            'MACOSX_DEPLOYMENT_TARGET': '10.7',
            'OTHER_CPLUSPLUSFLAGS': [ '-std=c++14' ]
          },
          'cflags': [ '-fvisibility=hidden '],
          'cflags_cc': [ '-std=c++14' ],
          'cflags!': [ '-fno-exceptions' ],
          'cflags_cc!': [ '-fno-exceptions' ],
        }]
      ]
    },
    {
      'target_name': 'action_after_build',
      'type': 'none',
      'dependencies': [ '<(module_name)' ],
      'copies': [
        {
          'files': [
            '<(PRODUCT_DIR)/pymport.node',
          ],
          'destination': '<(module_path)'
        }
      ]
    }
  ],
  'conditions': [
    ['builtin_python == "true" and OS == "linux"', {
      'targets': [{
        'target_name': 'builtin_python',
        'type': 'none',
        'actions': [{
          'action_name': 'Python',
          'inputs': [ './build_python.sh' ],
          'outputs': [ '<(module_path)/lib/libpython3.12.so' ],
          'action': [ 'sh', 'build_python.sh', '<(module_path)' ]
        }]
      }]
    }],
    ['builtin_python == "true" and OS == "mac"', {
      'targets': [
        {
          'target_name': 'builtin_python',
          'type': 'none',
          'actions': [{
            'action_name': 'Python',
            'inputs': [ './build_python.sh' ],
            'outputs': [ '<(module_path)/lib/libpython3.12.dylib' ],
            'action': [ 'sh', 'build_python.sh', '<(module_path)' ]
          }]
        },
        {
          'target_name': 'install_name_tool',
          'type': 'none',
          'dependencies': [ 'action_after_build' ],
          'actions': [
            {
              'action_name': 'install_name_tool_libpython3.12.dylib',
              'inputs': [ '<(module_path)/pymport.node' ],
              'outputs': [ '<(module_path)/.install_name_tool_dylib' ],
              'action': [
                'install_name_tool', '-change',
                '<(module_path)/lib/libpython3.12.dylib',
                '@loader_path/lib/libpython3.12.dylib',
                '<(module_path)/pymport.node'
              ]
            },
            {
              'action_name': 'install_name_tool_python',
              'inputs': [ '<(module_path)/pymport.node' ],
              'outputs': [ '<(module_path)/.install_name_tool_exe' ],
              'action': [
                'install_name_tool', '-change',
                '<(module_path)/lib/libpython3.12.dylib',
                '@loader_path/../lib/libpython3.12.dylib',
                '<(module_path)/bin/python3.12'
              ]
            }
          ]
        }
      ]
    }],
    ['builtin_python == "true" and OS == "win"', {
      'targets': [{
        'target_name': 'builtin_python',
        'type': 'none',
        'actions': [{
          'action_name': 'Python',
          'inputs': [ './build_python.bat' ],
          'outputs': [ '<(module_path)/Python312.lib', '<(module_root_dir)/build/Python-$(BUILTIN_PYTHON_VERSION)/Include/Python.h' ],
          'action': [ '<(module_root_dir)/build_python.bat', '<(module_path)' ]
        }]
      }]
    }]
  ]
}
