
const project = {
    "externalDomain": "postgres-example.me",
    "prodBranch": "prod",
    "plugins": [
        {
            "kind": "postgres",
            "clusterName": "postgres",
            "prodDedicated": true,
            "reviewDedicated": false,
        }
    ],
    "services": [
        {
            "image": "sosedoff/pgweb",
            "version": "0.16.2",
            "name": "pgadmin",
            "size": 1,
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

console.log(JSON.stringify(project))
