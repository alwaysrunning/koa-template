define({ "api": [  {    "type": "POST",    "url": "/solutionType/add",    "title": "新增规划方案目录",    "description": "<p>新增规划方案目录</p>",    "name": "addSolutionType",    "group": "solutionType",    "version": "1.0.0",    "parameter": {      "fields": {        "Parameter": [          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "title",            "description": "<p>目录名</p>"          },          {            "group": "Parameter",            "type": "String",            "optional": false,            "field": "imgUrl",            "description": "<p>目录的缩略图，通过上传文件自动生成，</p>"          }        ]      }    },    "permission": [      {        "name": "admin(管理员)"      }    ],    "success": {      "examples": [        {          "title": "返回数据",          "content": "{\n code: 0,\n message: '新建成功',\n data: {\n   id: 'x',\n   title: 'x',\n   imgUrl: 'x.png',\n   follow: 0,\n   created_at: 'x',\n   updated_at: 'x'\n }\n}",          "type": "json"        }      ],      "fields": {        "Success 200": [          {            "group": "Success 200",            "type": "Number",            "optional": false,            "field": "code",            "description": "<p>返回的code码，默认为0</p>"          },          {            "group": "Success 200",            "type": "String",            "optional": false,            "field": "message",            "description": "<p>返回的信息</p>"          },          {            "group": "Success 200",            "type": "object",            "optional": false,            "field": "data",            "description": "<p>返回的数据 { id: 唯一标志, title: 目录名, imgUrl: 目录缩略图, follow: 收藏的人数, created_at: 创建时间, updated_at: 更新时间 }</p>"          }        ]      }    },    "error": {      "examples": [        {          "title": "错误返回",          "content": "{\n code: -1,\n message: '具体的错误信息',\n data: {}\n}",          "type": "json"        }      ]    },    "filename": "src/controller/solution.js",    "groupTitle": "solutionType"  }] });
