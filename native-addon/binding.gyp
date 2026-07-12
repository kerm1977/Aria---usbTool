{
  "targets": [
    {
      "target_name": "performance-addon",
      "sources": [
        "src/performance-addon.cpp"
      ],
      "include_dirs": [
        "<!(node -e \"require('node-addon-api').include\")"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "defines": [ "NAPI_DISABLE_CPP_EXCEPTIONS" ],
      "conditions": [
        [
          "OS=='win'",
          {
            "defines": [
              "_HAS_EXCEPTIONS=0"
            ]
          }
        ]
      ]
    }
  ]
}
