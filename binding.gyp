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
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      'defines': [
        'NAPI_EXPERIMENTAL'
        'NODE_ADDON_API_DISABLE_DEPRECATED',
        'NAPI_VERSION=6'
      ],
      'libraries': [
        '<!@(pkg-config --libs python3-embed)'
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
      'cflags': [
        '<!@(pkg-config --cflags python3-embed)',
      ],
      'cflags!': [ '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'xcode_settings': {
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
        'CLANG_CXX_LIBRARY': 'libc++',
        'MACOSX_DEPLOYMENT_TARGET': '10.7',
        'OTHER_CFLAGS': [ '<!@(pkg-config --cflags python3-embed)' ],
      },
      'msvs_settings': {
        'VCCLCompilerTool': { 'ExceptionHandling': 1 },
      }
    },
    {
      'target_name': 'action_after_build',
      'type': 'none',
      'dependencies': [ '<(module_name)' ],
      'copies': [
        {
          'files': [
            '<(PRODUCT_DIR)/pymport-native.node',
          ],
          'destination': '<(module_path)'
        }
      ]
    }
  ]
}
