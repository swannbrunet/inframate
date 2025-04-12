import { ProjectSetting } from "../../src/domains/projectStackType/projectSetting.type.js";

const a: ProjectSetting = {
    "externalDomain": "postgres-example.me",
    "prodBranch": "prod",
    "plugins": [
        {
            "kind": "postgres",
            "clusterName": "postgres",
            "prodDedicated": true,
            "reviewDedicated": false,
            "size": "SMALL"
        }
    ],
    "services": [
        {
            "image": "sosedoff/pgweb",
            "version": "0.16.2",
            "name": "pgadmin",
            "size": "SMALL",
            "externalDomainPrefix": "gui",
            "exposedPort": 8080,
            "vars": [],
            "plugins": [
                {
                    "kind": "postgres",
                    "clusterName": "postgres",
                    "databaseName": "test",
                    "right": "rw",
                    "exportedEnvMapping": {
                        "uri": "DATABASE_URL",
                    }
                }
            ],
            "volumes": []
        }
    ]
}
