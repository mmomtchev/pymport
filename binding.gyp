{
  'variables': {
    'enable_asan%': 'false',
    'enable_coverage%': 'false'
  },
  'targets': [
    {
      'target_name': 'pymport-native',
      'sources': [ 
        'src/main.cc',
        'src/pyobj.cc',
        'src/call.cc',
        'src/fromjs.cc',
        'src/tojs.cc',
        'src/objstore.cc'
      ],
      'include_dirs': [
        '/usr/include/python3.8',
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      'libraries': [
        '-lpython3.8'
      ],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      'conditions': [
        ['enable_asan == "true"', {
          'cflags_cc': [ '-fsanitize=address' ],
          'ldflags' : [ '-fsanitize=address' ]
        }],
        ['enable_coverage == "true"', {
          'cflags_cc': [ '-fprofile-arcs', '-ftest-coverage' ],
          'ldflags' : [ '-lgcov', '--coverage' ]
        }]
      ],
      'cflags!': [ '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'xcode_settings': {
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
        'CLANG_CXX_LIBRARY': 'libc++',
        'MACOSX_DEPLOYMENT_TARGET': '10.7'
      },
      'msvs_settings': {
        'VCCLCompilerTool': { 'ExceptionHandling': 1 },
      }
    }
  ]
}