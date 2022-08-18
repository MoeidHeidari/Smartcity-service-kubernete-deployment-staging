import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import * as kubernetes from "@cdktf/provider-kubernetes"
import { HelmProvider } from "./.gen/providers/helm";
import * as path from "path"
import { Release } from "./.gen/providers/helm";
class MyStack extends TerraformStack {
  //app1: kubernetes.Deployment;
  namespace = "default";
  regCred: kubernetes.Secret
  kaiser_namespace: kubernetes.Namespace;
  // ============================================================third parties==========================================================================
  // Kafka
  kafka_helm: Release;
  // keycloak
  keycloak_helm: Release;
  // mongodb
  mongodb_helm: Release;
  // redis
  redis_helm: Release;
  // mqtt
  // =============================================================kaiser================================================================================
  // pyrador
  pyrador_deployment: kubernetes.Deployment
  pyrador_configmap: kubernetes.ConfigMap
  pyrador_secret: kubernetes.Secret
  pyrador_service: kubernetes.Service
  // iguana
  // zoo
  // goos
  // pigeons
  // crow
  crow_deployment: kubernetes.Deployment
  crow_configmap: kubernetes.ConfigMap
  crow_secret: kubernetes.Secret



  constructor(scope: Construct, name: string) {
    super(scope, name);


    new kubernetes.KubernetesProvider(this, 'kind', {
      configPath: path.join(__dirname, './kubeconfig.yaml'),
    })
    //-------------------------------------------------------------------------------------------------------------------

    new HelmProvider(this, 'helm', {
      kubernetes:
      {
        configPath: path.join(__dirname, './kubeconfig.yaml'),
      }

    })
    this.redis_helm = new Release(this, 'redis', {
      name: "redis",
      repository: "https://charts.bitnami.com/bitnami",
      chart: "redis",
      set: [
        {
          name: 'master.containerPorts.redis',
          value: '6378'
        },
        {
          name: 'master.service.ports.redis',
          value: '6378'
        },
        {
          name: 'replica.containerPorts.redis',
          value: '6378'
        },
        {
          name: 'replica.service.ports.redis',
          value: '6378'
        },
        {
          name: 'replica.replicaCount',
          value: '1'
        }

      ]

    })
    //-------------------------------------------------------------------------------------------------------------------
    this.kafka_helm = new Release(this, 'kafka', {
      name: "kafka",
      repository: "https://charts.bitnami.com/bitnami",
      chart: "kafka",

    })
    //-------------------------------------------------------------------------------------------------------------------
    this.mongodb_helm = new Release(this, 'mongodb', {
      name: "mongodb",
      repository: "https://charts.bitnami.com/bitnami",
      chart: "mongodb",
      version: "11.2.0",
      set: [
        {
          name: 'auth.rootPassword',
          value: `PoI456ZxC`
        },{
          name: 'livenessProbe.enabled',
          value: `false`
        },{
          name: 'readinessProbe.enabled',
          value: `false`
        }
      ]

    })
    //-------------------------------------------------------------------------------------------------------------------
    this.keycloak_helm = new Release(this, 'keycloak', {
      
      name: "keycloak",
      repository: "https://charts.bitnami.com/bitnami",
      chart: "keycloak",
      version: "9.6.8",
      set: [
        {
          name: 'auth.adminPassword',
          value: `PoI456ZxC`
        },
        {
          name: 'postgresql.auth.password',
          value: `PoI456ZxC`
        }
      ]

    })
    //-------------------------------------------------------------------------------------------------------------------
    this.kaiser_namespace = new kubernetes.Namespace(this, 'kaiser', {
      metadata: {
        name: 'kaiser'
      },
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.regCred = new kubernetes.Secret(this, 'regcred', {
      metadata: {
        name: "regcred",
        namespace: this.namespace,
      },
      type: 'kubernetes.io/dockerconfigjson',
      data: {
        '.dockerconfigjson': `{
          "auths": {
            "10.1.0.14:8081": {
              "auth": "Y29tZm9ydGVjaDpQb0k0NTZaeEM="
            }
          }
        }`
      }
    })

    //-------------------------------------------------------------------------------------------------------------------

    this.pyrador_configmap = new kubernetes.ConfigMap(this, "pyradorConfigmap", {
      metadata: {
        labels: {
          'io.kompose.service': 'pyrador-service'
        },
        name: 'pyrador-configmap',
        namespace: this.namespace
      },
      data: {
        'APP_PORT': '5000',
        'REDIS_HOST': 'redis',
        'REDIS_PORT': this.redis_helm.set.get(0).value,
        'KAFKA_HOST': 'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID': 'pyrador',
        'KAFKA_GROUP_ID': 'pyrador'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pyrador_secret = new kubernetes.Secret(this, 'pyradorSecret', {
      metadata: {
        name: "pyrador-secret",
        namespace: this.namespace,
      },
      type: 'Opaque',
      data: {
        'AUTH_KEY': 'TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF5ZFlZM2o2Skh3Qmd2aUZOd1o2bit0aHg5ZURjNTQ3VFJ1RlZySUNiZ3FPL3BjazZBb1FGTGZBWlB0azhZaHZtcVdjVWt0b1AwdUd2MXlkSWFSY1l4QVVGK29zZW1iWUlpc0h3cGh3K1lJaFJZdnFsbU5PeGNjd21nU0lFNlRpTlBjNFNVcDNrSG03aFdaRU9QY3VoREVzNEVTYWdyTGRCR2U1Qnl0dVhrZGNCUTVpeXFRU3lwdHlOY1I4enEzdGZ5cE9hbzZZckwzeWFRMjJaOEQvclVWRDA5SkNUUzBFaWdsT3c0S1M2TlJ0V05UeDhJdE1JMEZScWpLcWxqZDR2b1dEVm1rOTA2QzRjN0psV29VdG1QVDB4ZndYRlErN1A4bldWbXNJQ0VGYjRDN3ZzRlVKT2Jld2Q2cWZyY2MvRVdNOEtpZE9wUldjOGN6UHZEQkUwZlFJREFRQUI=',
        'REDIS_PASSWORD': 'password'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pyrador_deployment = new kubernetes.Deployment(this, 'pyradorDeplyment', {
      dependsOn:[
        {
          fqn:'pyrador-configmap'
        },
        {
          fqn:'pyrador-secret'
        },
        {
          fqn:'kafka'
        },
        {
          fqn:'redis'
        }
      ],
      metadata: {
        annotations: {
          'kompose.cmd': 'kompose convert',
          'kompose.version': '1.26.1 (a9d05d509)'
        },
        labels: {
          'io.kompose.service': 'pyrador'
        },
        name: 'pyrador',
        namespace: this.namespace
      },
      spec: {
        replicas: '1',
        selector: {
          matchLabels: {
            'io.kompose.service': 'pyrador'
          }
        },
        template: {
          metadata: {
            annotations: {
              'kompose.cmd': 'kompose convert',
              'kompose.version': '1.26.1 (a9d05d509)'
            },
            labels: {
              'io.kompose.service': 'pyrador'
            }
          },
          spec: {
            imagePullSecrets: [
              {
                name: 'regcred'
              }
            ],
            container: [
              {
                env: [
                  {
                    name: 'App_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pyrador-configmap',
                        key: 'APP_PORT'
                      }

                    }
                  },
                  {
                    name: 'REDIS_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pyrador-configmap',
                        key: 'REDIS_HOST'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pyrador-configmap',
                        key: 'REDIS_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pyrador-configmap',
                        key: 'KAFKA_HOST'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pyrador-configmap',
                        key: 'KAFKA_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_CLIENT_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pyrador-configmap',
                        key: 'KAFKA_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_GROUP_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pyrador-configmap',
                        key: 'KAFKA_GROUP_ID'
                      }

                    }
                  },
                  {
                    name: 'AUTH_KEY',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pyrador-secret',
                        key: 'AUTH_KEY'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PASSWORD',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pyrador-secret',
                        key: 'REDIS_PASSWORD'
                      }

                    }
                  }
                ],
                image: '10.1.0.14:8081/comfortech/pyrador_develop:v28',
                name: 'pyrador',
                port: [
                  {
                    containerPort: 5000
                  }
                ]
              },

            ]
          }
        }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pyrador_service = new kubernetes.Service(this, 'pyradorService', {
      metadata: {
        name: 'pyrador-service',
        annotations: {
          "kompose.cmd": "kompose convert",
          "kompose.version": "1.26.1 (a9d05d509)"
        },
        labels: {
          "io.kompose.service": "pyrador"
        }
      },
      spec: {
        port: [
          {
            name: "5000",
            port: 5001,
            targetPort: "5000"
          },

        ],
        selector: { "io.kompose.service": "pyrador" }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.crow_configmap = new kubernetes.ConfigMap(this, 'crowConfigmap', {
      metadata: {
        labels: {
          'io.kompose.service': 'crow-service'
        },
        name: 'crow-configmap',
        namespace: this.namespace
      },
      data: {
        'MONGO_BASE_URI': 'mongodb://mongodb',
        'MONGO_PORT': '27017',
        'MONGO_USERNAME': 'root',
        'MONGO_DB_NAME': 'comfortech',
        'MONGO_DEBUG': 'true',
        'REDIS_HOST': 'redis',
        'VAULT_HOST': 'http://localhost',
        'VAULT_PORT': '8200',
        'REDIS_PORT': this.redis_helm.set.get(0).value,
        'KAFKA_HOST': 'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID': 'comfortech-dataland',
        'KAFKA_GROUP_ID': 'comfortech-dataland',
        'KEYCLOAK_BASE_URI': 'http://keycloak"',
        'KEYCLOAK_PORT': '8080',
        'KEYCLOAK_REALM': 'master',
        'KEYCLOAK_GRANT_TYPE': 'password'
      }
    });
    this.crow_secret = new kubernetes.Secret(this, 'crowSecret', {
      metadata: {
        name: "crow-secret",
        namespace: this.namespace,
      },
      type: 'Opaque',
      data: {
        'MONGO_PASSWORD': 'PoI456ZxC',
        'REDIS_PASSWORD': 'UTzVGyKGcq',
        'VAULT_ROOT_TOKEN': 'bm90aGluZw==',
        'VAULT_TOKEN_PATH': 'dmF1bHQvZGF0YS92YXVsdF9yb290X3Rva2VuLmtleQ==',
        'VAULT_KEYS_PATH': 'dmF1bHQvZGF0YS9zZWFsaW5nX2tleXMua2V5',
        'KEYCLOAK_CLIENT_ACCOUNT_ID': 'MTUyYzlmZjMtMjAxMC00NDQ5LTllOTMtZmUwOTdkNjNjYTBi',
        'KEYCLOAK_CLIENT_ID': 'admin-cli',
        'KEYCLOAK_LOCAL_CLIENT_ID': 'comfortech',
        'KEYCLOAK_USERNAME': 'user',
        'KEYCLOAK_PASSWORD': 'PoI456ZxC',
      }
    });

    this.crow_deployment = new kubernetes.Deployment(this, 'crowDeployment', {
      dependsOn:[
        {
          fqn:'crow-configmap'
        },
        {
          fqn:'crow-secret'
        },
        {
          fqn:'kafka'
        },
        {
          fqn:'redis'
        },
        {
          fqn:'mongodb'
        },
        {
          fqn:'keycloak'
        }
      ],
      metadata: {
        name: "crow",
        annotations:{
          "kompose.cmd":"kompose convert",
          "kompose.version":"1.26.1 (a9d05d509)"
        },
        labels:{
          "io.kompose.service":"crow"
        },
        namespace:this.namespace
      },
      spec: {
        
        replicas:'1',
        selector:{
          matchLabels:{'io.kompose.service':'crow'}
        },
        template:{
          metadata:{
            annotations:{
              'kompose.cmd':'kompose convert',
              'kompose.version':'1.26.1 (a9d05d509)'
            },
            labels:{
              'io.kompose.service':'crow'
            }
          },
          spec:{
            imagePullSecrets:[
              {
                name:'regcred'
              }
            ],
            container:[
              {
                env:[
                  {
                    name: 'MONGO_BASE_URI',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'MONGO_BASE_URI'
                      }

                    }
                  },
                  {
                    name: 'MONGO_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'MONGO_PORT'
                      }

                    }
                  },
                  {
                    name: 'MONGO_USERNAME',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'MONGO_USERNAME'
                      }

                    }
                  },
                  {
                    name: 'MONGO_DB_NAME',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'MONGO_DB_NAME'
                      }

                    }
                  },
                  {
                    name: 'MONGO_DEBUG',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'MONGO_DEBUG'
                      }

                    }
                  },
                  {
                    name: 'REDIS_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'REDIS_HOST'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'REDIS_PORT'
                      }

                    }
                  },
                  {
                    name: 'VAULT_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'VAULT_HOST'
                      }

                    }
                  },
                  {
                    name: 'VAULT_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'VAULT_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'KAFKA_HOST'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'KAFKA_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_CLIENT_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'KAFKA_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_GROUP_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'KAFKA_GROUP_ID'
                      }

                    }
                  },
                  {
                    name: 'KEYCLOAK_BASE_URI',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'KEYCLOAK_BASE_URI'
                      }

                    }
                  },
                  {
                    name: 'KEYCLOAK_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'KEYCLOAK_PORT'
                      }

                    }
                  },
                  {
                    name: 'KEYCLOAK_REALM',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'KEYCLOAK_REALM'
                      }

                    }
                  },
                  {
                    name: 'KEYCLOAK_GRANT_TYPE',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'KEYCLOAK_GRANT_TYPE'
                      }

                    }
                  },
                  {
                    name: 'MONGO_PASSWORD',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'MONGO_PASSWORD'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PASSWORD',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'REDIS_PASSWORD'
                      }

                    }
                  },
                  {
                    name: 'VAULT_ROOT_TOKEN',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'VAULT_ROOT_TOKEN'
                      }

                    }
                  },
                  {
                    name: 'VAULT_TOKEN_PATH',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'VAULT_TOKEN_PATH'
                      }

                    }
                  },
                  {
                    name: 'VAULT_KEYS_PATH',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'VAULT_KEYS_PATH'
                      }

                    }
                  },
                  {
                    name: 'KEYCLOAK_CLIENT_ACCOUNT_ID',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'KEYCLOAK_CLIENT_ACCOUNT_ID'
                      }

                    }
                  },
                  {
                    name: 'KEYCLOAK_CLIENT_ID',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'KEYCLOAK_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'KEYCLOAK_LOCAL_CLIENT_ID',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'KEYCLOAK_LOCAL_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'KEYCLOAK_USERNAME',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'KEYCLOAK_USERNAME'
                      }

                    }
                  },
                  {
                    name: 'KEYCLOAK_PASSWORD',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'KEYCLOAK_PASSWORD'
                      }

                    }
                  }
                ],
                image:'10.1.0.14:8081/comfortech/crow:v1.0',
                name:'crow'              
              }
            ],
            restartPolicy:'Always'
          }
        }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------

    // this.app1=new kubernetes.Deployment(this, 'deployment', {
    //   metadata: {

    //     labels: {
    //       app: 'myapp',
    //       component: 'frontend',
    //       environment: 'dev',
    //     },
    //     name: 'myapp',
    //   },
    //   spec: {
    //     replicas: '1',
    //     selector: {
    //       matchLabels: {
    //         app: 'myapp',
    //         component: 'frontend',
    //         environment: 'dev',
    //       },
    //     },
    //     template: {
    //       metadata: {
    //         labels: {
    //           app: 'myapp',
    //           component: 'frontend',
    //           environment: 'dev',
    //         },
    //       },
    //       spec: {
    //         container: [
    //           {
    //             image: 'nginx:latest',
    //             name: 'frontend',
    //           },
    //         ],
    //       },
    //     },
    //   },
    // })

    // define resources here
  }
}

const app = new App();
new MyStack(app, "cdktf");
app.synth();
