import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import * as kubernetes from "@cdktf/provider-kubernetes"
import { HelmProvider } from "./.gen/providers/helm";
import * as path from "path"
import { Release } from "./.gen/providers/helm";
class ProdStack extends TerraformStack {
  //app1: kubernetes.Deployment;
  namespace = "default";
  regCred: kubernetes.Secret
  kaiser_namespace: kubernetes.Namespace;
  pvs:kubernetes.PersistentVolume[]
  // ============================================================third parties==========================================================================
  // Kafka
  kafka_helm: Release;
  
  // keycloak
  //keycloak_helm: Release;
  ingress_controller_helm: Release;
  // mongodb
  mongodb_helm: Release;
  // redis
  redis_helm: Release;
  // mqtt
  mqtt_helm: Release;
  // =============================================================kaiser================================================================================
  // pyrador
  pyrador_deployment: kubernetes.Deployment
  pyrador_configmap: kubernetes.ConfigMap
  pyrador_secret: kubernetes.Secret
  pyrador_service: kubernetes.Service
  pyrador_ingress:kubernetes.IngressV1
  pyrador_ingress_DNS_record='auth.dipal.ru'
  // iguana
  iguana_deployment: kubernetes.Deployment
  iguana_configmap: kubernetes.ConfigMap
  iguana_secret: kubernetes.Secret
  iguana_service: kubernetes.Service
  iguana_ingress: kubernetes.IngressV1
  iguana_ingress_DNS_record='dipal.ru'
  // zoo
  zoo_deployment: kubernetes.Deployment
  zoo_configmap: kubernetes.ConfigMap
  zoo_secret: kubernetes.Secret
  zoo_service: kubernetes.Service
  zoo_ingress: kubernetes.IngressV1
 zoo_ingress_DNS_record='panel.dipal.ru'
  // // goos
  goos_deployment: kubernetes.Deployment
  goos_configmap: kubernetes.ConfigMap
  goos_secret: kubernetes.Secret
  // // pigeons
  pigeons_deployment: kubernetes.Deployment
  pigeons_configmap: kubernetes.ConfigMap
  pigeons_secret: kubernetes.Secret
  // crow
  crow_deployment: kubernetes.Deployment
  crow_configmap: kubernetes.ConfigMap
  crow_secret: kubernetes.Secret



  constructor(scope: Construct, name: string) {
    super(scope, name);
    this.pvs=new Array<kubernetes.PersistentVolume>()
    new kubernetes.KubernetesProvider(this, 'kind', {
      configPath: path.join(__dirname, './kubeconfig_prod.yaml'),
    })
    //-------------------------------------------------------------------------------------------------------------------
    new HelmProvider(this, 'helm', {
      kubernetes:
      {
        configPath: path.join(__dirname, './kubeconfig_prod.yaml'),
      }

    })

    //-------------------------------------------------------------------------------------------------------------------
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
        },
        {
          name: 'auth.password',
          value: 'PoI456ZxC'
        }

      ]

    })
    //-------------------------------------------------------------------------------------------------------------------
    for (let index = 1; index < 15; index++) {
      
      const pv: kubernetes.PersistentVolume=new kubernetes.PersistentVolume(this,'kaiser-pv'+index,{
        metadata:{
          name:'kaiser-pv'+index
        },
        spec:[
          {
            capacity:{
              'storage':'10Gi'
            },
            accessModes:[
              'ReadWriteOnce'
            ],
            persistentVolumeReclaimPolicy:'Delete',
            persistentVolumeSource:{
              local:{
                path:'/home/ubuntu/storage/pv'+index
              }
            },
            nodeAffinity:{
              required:{
                nodeSelectorTerm:[
                  {
                    matchExpressions:[
                      {
                        key:'kubernetes.io/hostname',
                        values:['kaiser-master'],
                        operator:'In'
                      }
                    ]
                  }
                ]
              }
            }
  
          }
        ]
      })
      this.pvs.push(pv);
    }
    //-------------------------------------------------------------------------------------------------------------------
    this.kafka_helm = new Release(this, 'kafka', {
      name: "kafka",
      repository: "https://charts.bitnami.com/bitnami",
      chart: "kafka",

    })
    //-------------------------------------------------------------------------------------------------------------------
    this.ingress_controller_helm=this.kafka_helm = new Release(this, 'ingress-controller', {
      name: "ingress-controller",
      repository: "https://charts.bitnami.com/bitnami",
      chart: "nginx-ingress-controller",

    })
    //-------------------------------------------------------------------------------------------------------------------
    this.mqtt_helm = new Release(this, 'mqtt', {
      name: "mqtt",
      repository: "https://k8s-at-home.com/charts/",
      chart: "mosquitto",

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
    this.zoo_configmap=new kubernetes.ConfigMap(this,"zoo-configmap",{
      metadata: {
        labels: {
          'io.kompose.service': 'zoo-service'
        },
        name: 'zoo-configmap',
        namespace: this.namespace
      },
      data: {
        'APP_PORT': '6000',
        'REDIS_HOST': 'redis-master',
        'REDIS_PORT': '6378',
        'KAFKA_HOST': 'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID': 'zoo',
        'KAFKA_GROUP_ID': 'zoo'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.zoo_secret=new kubernetes.Secret(this,"zoo-secret",{
      metadata: {
        name: "zoo-secret",
        namespace: this.namespace,
      },
      type: 'Opaque',
      data: {

         
        'AUTH_KEY': 'TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF5ZFlZM2o2Skh3Qmd2aUZOd1o2bit0aHg5ZURjNTQ3VFJ1RlZySUNiZ3FPL3BjazZBb1FGTGZBWlB0azhZaHZtcVdjVWt0b1AwdUd2MXlkSWFSY1l4QVVGK29zZW1iWUlpc0h3cGh3K1lJaFJZdnFsbU5PeGNjd21nU0lFNlRpTlBjNFNVcDNrSG03aFdaRU9QY3VoREVzNEVTYWdyTGRCR2U1Qnl0dVhrZGNCUTVpeXFRU3lwdHlOY1I4enEzdGZ5cE9hbzZZckwzeWFRMjJaOEQvclVWRDA5SkNUUzBFaWdsT3c0S1M2TlJ0V05UeDhJdE1JMEZScWpLcWxqZDR2b1dEVm1rOTA2QzRjN0psV29VdG1QVDB4ZndYRlErN1A4bldWbXNJQ0VGYjRDN3ZzRlVKT2Jld2Q2cWZyY2MvRVdNOEtpZE9wUldjOGN6UHZEQkUwZlFJREFRQUI=',
        'REDIS_PASSWORD': 'PoI456ZxC'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.zoo_deployment=new kubernetes.Deployment(this,"zoo-deployment",{
      metadata: {
        annotations: {
          'kompose.cmd': 'kompose convert',
          'kompose.version': '1.26.1 (a9d05d509)'
        },
        labels: {
          'io.kompose.service': 'zoo'
        },
        name: 'zoo',
        namespace: this.namespace
      },
      spec: {
        replicas: '1',
        selector: {
          matchLabels: {
            'io.kompose.service': 'zoo'
          }
        },
        template: {
          metadata: {
            annotations: {
              'kompose.cmd': 'kompose convert',
              'kompose.version': '1.26.1 (a9d05d509)'
            },
            labels: {
              'io.kompose.service': 'zoo'
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
                    name: 'APP_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'APP_PORT'
                      }

                    }
                  },
                  {
                    name: 'REDIS_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'REDIS_HOST'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'REDIS_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'KAFKA_HOST'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'KAFKA_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_CLIENT_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'KAFKA_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_GROUP_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'KAFKA_GROUP_ID'
                      }

                    }
                  },
                  {
                    name: 'AUTH_KEY',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'zoo-secret',
                        key: 'AUTH_KEY'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PASSWORD',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'zoo-secret',
                        key: 'REDIS_PASSWORD'
                      }

                    }
                  }
                ],
                image: '10.1.0.14:8081/comfortech/zoo_develop:v29',
                name: 'zoo',
                port: [
                  {
                    containerPort: 6000
                  }
                ]
              },

            ]
          }
        }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.zoo_service=new kubernetes.Service(this,"zoo-service",{
      metadata: {
        name: 'zoo-service',
        annotations: {
          "kompose.cmd": "kompose convert",
          "kompose.version": "1.26.1 (a9d05d509)"
        },
        labels: {
          "io.kompose.service": "zoo"
        }
      },
      spec: {
        port: [
          {
            name: "6001",
            port: 6001,
            targetPort: "6000"
          },

        ],
        type:"ClusterIP",
        selector: { "io.kompose.service": "zoo" }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.zoo_ingress=new kubernetes.IngressV1(this,"zoo-ingress",{
      metadata:{
        name:'zoo-ingress',
        namespace:this.namespace,
        annotations:{
          'kubernetes.io/ingress.class': 'nginx'
        },
      },
      spec:{
        rule:[
          {
            host:this.zoo_ingress_DNS_record,
            http:{
              path:[
                {
                  path:"/",
                  backend:{
                    service:{
                      name:'zoo-service',
                      port:{
                        number:6001
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
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
        'REDIS_HOST': 'redis-master',
        'REDIS_PORT': '6378',
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
        'REDIS_PASSWORD': 'PoI456ZxC'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pyrador_deployment = new kubernetes.Deployment(this, 'pyradorDeplyment', {
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
                image: '10.1.0.14:8081/comfortech/pyrador_develop:v30',
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
        type:"ClusterIP",
        selector: { "io.kompose.service": "pyrador" }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pyrador_ingress= new kubernetes.IngressV1(this,'pyrador-ingress',{
      metadata:{
        name:'pyrador-ingress',
        namespace:this.namespace,
        annotations:{
          'kubernetes.io/ingress.class': 'nginx'
        },
      },
      spec:{
        rule:[
          {
            host:this.pyrador_ingress_DNS_record,
            http:{
              path:[
                {
                  path:"/",
                  backend:{
                    service:{
                      name:'pyrador-service',
                      port:{
                        number:5001
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
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
        'REDIS_HOST': 'redis-master',
        'VAULT_HOST': 'http://localhost',
        'VAULT_PORT': '8200',
        'REDIS_PORT': '6378',
        'KAFKA_HOST': 'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID': 'comfortech-dataland',
        'KAFKA_GROUP_ID': 'comfortech-dataland',
        'KEYCLOAK_BASE_URI': 'https://auth.techpal.ru',
        'KEYCLOAK_PORT': '8080',
        'KEYCLOAK_REALM': 'comfortech_production',
        'KEYCLOAK_GRANT_TYPE': 'password',
        'NEXT_TRY_TIME': '60000',
        'OTP_EXPIRATION_TIME': '60000',
        'BILLING_BASE_URL':'https://api.uut-telecom.ru/api/v1.0'
      }
    });
    //-------------------------------------------------------------------------------------------------------------------
    this.crow_secret = new kubernetes.Secret(this, 'crowSecret', {
      metadata: {
        name: "crow-secret",
        namespace: this.namespace,
      },
      type: 'Opaque',
      data: {
        'MONGO_PASSWORD': 'PoI456ZxC',
        'REDIS_PASSWORD': 'PoI456ZxC',
        'VAULT_ROOT_TOKEN': 'bm90aGluZw==',
        'VAULT_TOKEN_PATH': 'dmF1bHQvZGF0YS92YXVsdF9yb290X3Rva2VuLmtleQ==',
        'VAULT_KEYS_PATH': 'dmF1bHQvZGF0YS9zZWFsaW5nX2tleXMua2V5',
        'KEYCLOAK_CLIENT_ACCOUNT_ID': '0d68a12c-7e3e-4995-8604-bc7eb3327fd4',
        'KEYCLOAK_CLIENT_ID': 'admin-cli',
        'KEYCLOAK_LOCAL_CLIENT_ID': 'comfortech',
        'KEYCLOAK_USERNAME': 'admin',
        'KEYCLOAK_PASSWORD': 'PoI456ZxC',
        'SECURITY_KEY':'971ebba1602e952acd7a549ca3826e41',
      }
    });
    //-------------------------------------------------------------------------------------------------------------------
    this.crow_deployment = new kubernetes.Deployment(this, 'crowDeployment', {
      
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
            hostAliases:[
              {
                ip:'10.1.0.8',
                hostnames:[
                  "auth.techpal.ru"
                ]
              }
            ],
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
                    name: 'NEXT_TRY_TIME',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'NEXT_TRY_TIME'
                      }

                    }
                  },
                  {
                    name: 'OTP_EXPIRATION_TIME',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'OTP_EXPIRATION_TIME'
                      }

                    }
                  },
                  {
                    name: 'BILLING_BASE_URL',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'BILLING_BASE_URL'
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
                    name: 'SECURITY_KEY',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'SECURITY_KEY'
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
                image:'10.1.0.14:8081/comfortech/crow_develop:v88',
                name:'crow'              
              }
            ],
            restartPolicy:'Always'
          }
        }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.iguana_configmap=new kubernetes.ConfigMap(this,'iguana-configmap',{
      metadata:{
        labels:{
          "io.kompose.service":"iguana-service"
        },
        name:"iguana-configmap",
        namespace:this.namespace
      },
      data:{
        'APP_PORT':'2000',
        'REDIS_HOST':'redis-master',
        'REDIS_PORT':'6378',
        'KAFKA_HOST':'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID':'iguana',
        'KAFKA_GROUP_ID':'iguana'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.iguana_secret=new kubernetes.Secret(this,'iguana-secret',{
      metadata:{
        name:'iguana-secret',
        namespace:this.namespace
      },
      type:'Opaque',
      data:{
        'AUTH_KEY':'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1NRiTS/qUw5FPKBB4wI2SNcAFLkZlYk0DJ+Q2wg15HNJFqghkKD62X6HQpFbOs+5DzAKj1o0jIQjB4J9+qMyffUjJgXWfmVPLxrKQRe4pFK2PU/QtbWkADLNjzvax+CtMeycDFNDoVIWOZNslGwZbblpOxJ7ao5BamHrbIKKIzim79WyMa3GvhAq81SpotHmSvLOIynskeIEgg9yhhscBMx4vFPL+YO6Z643eguJgzQs6VgV2XNLt0LuUM0cwC2Fyv+odECmxOifXaMYJPAE8z/516M3fAOq1ymb0R/BaMjD5OJjo+BWNqV6Sd5fCH2dg4wa/0+6fpQl2bi5ZzmimQIDAQAB',
        'REDIS_PASSWORD': 'PoI456ZxC',
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.iguana_deployment=new kubernetes.Deployment(this,'iguana-deployment',{
      metadata: {
        annotations: {
          'kompose.cmd': 'kompose convert',
          'kompose.version': '1.26.1 (a9d05d509)'
        },
        labels: {
          'io.kompose.service': 'iguana'
        },
        name: 'iguana',
        namespace: this.namespace
      },
      spec:{
        replicas: '1',
        selector: {
          matchLabels: {
            'io.kompose.service': 'iguana'
          }
        },
        template:{
          metadata: {
            annotations: {
              'kompose.cmd': 'kompose convert',
              'kompose.version': '1.26.1 (a9d05d509)'
            },
            labels: {
              'io.kompose.service': 'iguana'
            }
          },
          spec:{
            imagePullSecrets: [
              {
                name: 'regcred'
              }
            ],
            container:[
              {
              env:[
                {
                  name: 'App_PORT',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'APP_PORT'
                    }
                  }
                },
                {
                  name: 'REDIS_HOST',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'REDIS_HOST'
                    }
                  }
                },
                {
                  name: 'REDIS_PORT',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'REDIS_PORT'
                    }
                  }
                },
                {
                  name: 'KAFKA_HOST',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'KAFKA_HOST'
                    }
                  }
                },
                {
                  name: 'KAFKA_PORT',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'KAFKA_PORT'
                    }
                  }
                },
                {
                  name: 'KAFKA_CLIENT_ID',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'KAFKA_CLIENT_ID'
                    }
                  }
                },
                {
                  name: 'KAFKA_GROUP_ID',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'KAFKA_GROUP_ID'
                    }
                  }
                },
                {
                  name: 'AUTH_KEY',
                  valueFrom: {
                    secretKeyRef:
                    {
                      name: 'iguana-secret',
                      key: 'AUTH_KEY'
                    }
                  }
                },
                {
                  name: 'REDIS_PASSWORD',
                  valueFrom: {
                    secretKeyRef:
                    {
                      name: 'iguana-secret',
                      key: 'REDIS_PASSWORD'
                    }
                  }
                },
              ],
              image:'10.1.0.14:8081/comfortech/iguana_develop:v64',
              name:'iguana',
              port: [
                {
                  containerPort: 2000
                }
              ]
              }
            ],
          }
        }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.iguana_service=new kubernetes.Service(this,'iguana-service',{
      metadata: {
        name: 'iguana-service',
        annotations: {
          "kompose.cmd": "kompose convert",
          "kompose.version": "1.26.1 (a9d05d509)"
        },
        labels: {
          "io.kompose.service": "iguana"
        }
      },
      spec: {
        port: [
          {
            name: "2000",
            port: 2001,
            targetPort: "2000"
          },

        ],
        type:"ClusterIP",
        selector: { "io.kompose.service": "iguana" }
      }
    })

    //-------------------------------------------------------------------------------------------------------------------
    this.iguana_ingress=new kubernetes.IngressV1(this,'iguana-ingress',{
      metadata:{
        name:'iguana-ingress',
        namespace:this.namespace,
        annotations:{
          'kubernetes.io/ingress.class': 'nginx'
        },
      },
      spec:{
        rule:[
          {
            host:this.iguana_ingress_DNS_record,
            http:{
              path:[
                {
                  path:"/",
                  backend:{
                    service:{
                      name:'iguana-service',
                      port:{
                        number:2001
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.goos_configmap=new kubernetes.ConfigMap(this,'goose-configmap',{
      metadata: {
        labels: {
          'io.kompose.service': 'goose-service'
        },
        name: 'goose-configmap',
        namespace: this.namespace
      },
      data:{
        'REDIS_HOST': 'redis-master',
        'REDIS_PORT': '6378',
        'KAFKA_HOST': 'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID': 'goose-consumer',
        'KAFKA_GROUP_ID': 'goose-consumer',
        'MQTT_HOST': 'mqtt',
        'MQTT_PORT': '1883',
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.goos_secret=new kubernetes.Secret(this,'goose-secret',{
      metadata: {
        name: "goose-secret",
        namespace: this.namespace,
      },
      type: 'Opaque',
      data: {
        'REDIS_PASSWORD': 'PoI456ZxC',
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.goos_deployment=new kubernetes.Deployment(this,'goose-deployment',{
      metadata: {
        name: "goose",
        annotations:{
          "kompose.cmd":"kompose convert",
          "kompose.version":"1.26.1 (a9d05d509)"
        },
        labels:{
          "io.kompose.service":"goose"
        },
        namespace:this.namespace
      },
      spec: {
        
        replicas:'1',
        selector:{
          matchLabels:{'io.kompose.service':'goose'}
        },
        template:{
          metadata:{
            annotations:{
              'kompose.cmd':'kompose convert',
              'kompose.version':'1.26.1 (a9d05d509)'
            },
            labels:{
              'io.kompose.service':'goose'
            }
          },
          spec:{
            hostAliases:[
              {
                ip:'10.1.0.8',
                hostnames:[
                  "auth.techpal.ru"
                ]
              }
            ],
            imagePullSecrets:[
              {
                name:'regcred'
              }
            ],
            container:[
              {
                env:[
                  {
                    name: 'REDIS_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'REDIS_HOST'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'REDIS_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'KAFKA_HOST'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'KAFKA_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_CLIENT_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'KAFKA_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_GROUP_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'KAFKA_GROUP_ID'
                      }

                    }
                  },
                  {
                    name: 'MQTT_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'MQTT_HOST'
                      }

                    }
                  },
                  {
                    name: 'MQTT_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'MQTT_PORT'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PASSWORD',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'goose-secret',
                        key: 'REDIS_PASSWORD'
                      }

                    }
                  }
                ],
                image:'10.1.0.14:8081/comfortech/goose_develop:v40',
                name:'goose'              
              }
            ],
            restartPolicy:'Always'
          }
        }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pigeons_configmap=new kubernetes.ConfigMap(this,'pigeons-configmap',{
      metadata:{
        labels:{
          "io.kompose.service":"pigeons-service"
        },
        name:"pigeons-configmap",
        namespace:this.namespace
      },
      data:{
        'REDIS_HOST':'redis-master',
        'REDIS_PORT':'6378',
        'KAFKA_HOST':'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID':'pigeons',
        'KAFKA_GROUP_ID':'pigeons',
        'NODE_TLS_REJECT_UNAUTHORIZED':'0'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pigeons_secret=new kubernetes.Secret(this,'pigeons-secret',{
      metadata:{
        name:'pigeons-secret',
        namespace:this.namespace
      },
      type:'Opaque',
      data:{
        'REDIS_PASSWORD': 'PoI456ZxC',
        'EMAIL_FROM': 'Comfortel <comfortec@yandex.ru>',
        'EMAIL_USER': 'comfortec',
        'EMAIL_PASS': 'orvavpirmuiqqrip',
        'EMAIL_HOST': 'smtp.yandex.ru',
        'EMAIL_PORT': '465',
        'SMS_BASE_URL': 'https://smpp.comfortel.pro:13013',
        'SMS_PASS': 'Chuichi2aiti',
        'SMS_USER': 'techpal',
        'SMS_SENDER': 'Comfortel',
        'FIREBASE_ACCOUNT_TYPE': 'service_account',
        'FIREBASE_ACCOUNT_PROJECT_ID': 'comfortech-12a15',
        'FIREBASE_ACCOUNT_PRIVATE_KEY_ID': '481c511d487607199bf67ebed2f6f3e555597b41',
        'FIREBASE_ACCOUNT_PRIVATE_KEY': '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCdOYq29CxrkTNt\n1XfIxLjnR6yUsemRHYoIho1FYxruP5p0957ZVmdv5AXbwOmecTYXwy8FBlyVFNBE\na7TKDEP1BMlBK7MwN23431DDjKYx/YQjksDb2XAz+ykosv0A3G0r9nJjr8iPmDEa\nwXK3U5ISdX0yMW/kSfWkQ3kBCgdL1G1FtWQBuxp83EHAgv+GW3wcIr4srZmOHjit\nI2BEwfzUhZ/GpMg7sQkItzJ33tTmsuMownas6hknKCqRVr8DzZ9JZZ2rLaQZvaUN\nskd+/QlyejHN9APes0Cc1kXEbzJU1a3Mgm9fkWUCtewth54JmbZn+sQsiBvrAg+x\n8IPALoEpAgMBAAECggEAHWgYjZEcaM8a7Sle0t6Wje2ONi6TlsiNW3xdGnQHorWj\nPErfO1vJk3g0704E9BVNLoMbfYdb1Cd1L8LsaNkD8eVABjA3/uXzK/gKyVR6dkGq\nUCP/7e7cqWBJ6bqWjy1rPuyEpygG7XKkBpLVk7vuB4VRkgyEltCNgPh8vqjDRheN\nTcweIH4oEXTgYhJ0Krx9zU/ZYxchc/S6g/GFJNVSXUQAL31U4GzqP857sSAnQ2OT\n4Ue6JYGTgSPd3ogWOXJGuxn+9Mb+IwapV8T8KADBMZhRqkD9YeKb8s5/qo0KQBCV\naSmL+ZYV7KkHZWie26hhTTvqj/Ll92+cyFF/LfIHzQKBgQDXie9+HslGvdVQFayD\nIfnZD3DaGn7y+FNUOAmw8jMLhsy7eutHgHmpOwW+ctJSlzdrP6lbFhFxdiZ6ok8L\nmZFeZJTv5fsNCrGoQ9yLnZCnrCEJ2BUgSCyS0TTem3p2+4tQgZcbzj32fI7KR5v8\n8BQcK1fnBgZ6XztMLj9qFv1RxQKBgQC6vTs8PMZCoaNici+nT7/KLmepkEyz9cJn\nQp2uCohmy0zAZ9Me7DSxLnaIOom1zmBJWIK/48/41FH2eVxyH5Pd1F5wIjrTX5/Y\nAFpX2Rz0AKMn4BhXEU1umuxShQRQ5aUJO0xf/x2h5TdKcnlzuMYHDfBFr8WuN0/H\nXSdS2DRcFQKBgHXCWOTRMSrDQK42iUBD6dubwg6Hd2CMKArVawYP7a+YgHbV24H/\nQXkiVCsPVLXnBFJGP+MSFYmmAbPyxbkSuAeYcH75acZgV1wVZ4OoHIZfVtWoBzLR\n+/hi8L3GuIwVNrJPex2n+taWivUdVq5FBNe3HpmMAzIMobsncWInGVP5AoGBAKGR\nXnIE50j5T0K7Jw3syzTkJ56nEiZWSWhMU98kj9XYqkSC0ECeAA0Y9Udy1nlt4RM0\nuJPMSMGy+mN1p426UpaIy1jb1OfTgZpC2+fMGufmsUOr+YNDnipHcpcHLa/MsZkm\nLDOWqI3No6QPHZQJV5T881ln9nKAus70gzSDifHtAoGBAI6L/8RXh/9TSqBs8QXV\nyWYIPrOfAVXQnbxMSlbFP/9Y4VDyDOtWLU577VEPpzzr9on54D6grcxH50kyruA1\np0nio67uyRdgGqOCbEKDpeI7fDWLZ4DeCcaGn8i78gXylSey6rG5NTbKCqSDMDlX\nKzWiIoOL1qfCWhjHAWzY52Pb\n-----END PRIVATE KEY-----\n',
        'FIREBASE_ACCOUNT_CLIENT_EMAIL': 'firebase-adminsdk-2mrcb@comfortech-12a15.iam.gserviceaccount.com',
        'FIREBASE_ACCOUNT_CLIENT_ID': '104778641386557489050',
        'FIREBASE_ACCOUNT_AUTH_URI': 'https://accounts.google.com/o/oauth2/auth',
        'FIREBASE_ACCOUNT_TOKEN_URI': 'https://oauth2.googleapis.com/token',
        'FIREBASE_ACCOUNT_AUTH_PROVIDER_X509_CERT_ULL': 'https://www.googleapis.com/oauth2/v1/certs',
        'FIREBASE_ACCOUNT_CLIENT_X509_CERT_URL': 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-2mrcb%40comfortech-12a15.iam.gserviceaccount.com',
        'FIREBASE_DEFAULT_MESSAGE_TITLE': 'Comfortech',
        'FIREBASE_DEFAULT_MESSAGE_BODY': 'Empty message',
        'FIREBASE_DEFAULT_MESSAGE_IMAGE_URL': 'https://sun1-26.userapi.com/s/v1/if1/2Dhrl9gqlWW7XVRbXiBRdtduvtw4PTiYRE0K9A9qVfypNzoERhBxUj_ch5VP6-RBWSyvQ9_q.jpg?size=400x0&quality=96&crop=108,115,484,484&ava=1',
        'FIREBASE_REGISTRATION_TOKEN': 'AIzaSyCf5LhHwWcWWgjKCHv1I32lko6QusPty-I'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pigeons_deployment=new kubernetes.Deployment(this,'pigeons-deployment',{
      metadata: {
        name: "pigeons",
        annotations:{
          "kompose.cmd":"kompose convert",
          "kompose.version":"1.26.1 (a9d05d509)"
        },
        labels:{
          "io.kompose.service":"pigeons"
        },
        namespace:this.namespace
      },
      spec: {
        
        replicas:'1',
        selector:{
          matchLabels:{'io.kompose.service':'pigeons'}
        },
        template:{
          metadata:{
            annotations:{
              'kompose.cmd':'kompose convert',
              'kompose.version':'1.26.1 (a9d05d509)'
            },
            labels:{
              'io.kompose.service':'pigeons'
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
                    name: 'REDIS_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'REDIS_HOST'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'REDIS_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'KAFKA_HOST'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'KAFKA_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_CLIENT_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'KAFKA_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_GROUP_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'KAFKA_GROUP_ID'
                      }

                    }
                  },
                  {
                    name: 'NODE_TLS_REJECT_UNAUTHORIZED',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'NODE_TLS_REJECT_UNAUTHORIZED'
                      }

                    }
                  },
                  
                  {
                    name: 'REDIS_PASSWORD',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'REDIS_PASSWORD'
                      }

                    }
                  },
                  {
                    name: 'EMAIL_FROM',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'EMAIL_FROM'
                      }

                    }
                  },
                  {
                    name: 'EMAIL_USER',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'EMAIL_USER'
                      }

                    }
                  },
                  {
                    name: 'EMAIL_PASS',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'EMAIL_PASS'
                      }

                    }
                  },
                  {
                    name: 'EMAIL_HOST',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'EMAIL_HOST'
                      }

                    }
                  },
                  {
                    name: 'EMAIL_PORT',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'EMAIL_PORT'
                      }

                    }
                  },
                  {
                    name: 'SMS_BASE_URL',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'SMS_BASE_URL'
                      }

                    }
                  },
                  {
                    name: 'SMS_SENDER',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'SMS_SENDER'
                      }

                    }
                  },
                  {
                    name: 'SMS_USER',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'SMS_USER'
                      }

                    }
                  },
                  {
                    name: 'SMS_PASS',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'SMS_PASS'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_TYPE',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_TYPE'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_PROJECT_ID',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_PROJECT_ID'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_PRIVATE_KEY_ID',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_PRIVATE_KEY_ID'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_PRIVATE_KEY',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_PRIVATE_KEY'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_CLIENT_EMAIL',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_CLIENT_EMAIL'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_CLIENT_ID',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_AUTH_URI',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_AUTH_URI'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_TOKEN_URI',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_TOKEN_URI'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_AUTH_PROVIDER_X509_CERT_ULL',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_AUTH_PROVIDER_X509_CERT_ULL'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_CLIENT_X509_CERT_URL',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_CLIENT_X509_CERT_URL'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_DEFAULT_MESSAGE_TITLE',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_DEFAULT_MESSAGE_TITLE'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_DEFAULT_MESSAGE_BODY',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_DEFAULT_MESSAGE_BODY'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_DEFAULT_MESSAGE_IMAGE_URL',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_DEFAULT_MESSAGE_IMAGE_URL'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_REGISTRATION_TOKEN',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_REGISTRATION_TOKEN'
                      }

                    }
                  },
                ],
                image:'10.1.0.14:8081/comfortech/pigeons_develop:v38',
                name:'pigeons'              
              }
            ],
            restartPolicy:'Always'
          }
        }
      }
    })

    // define resources here
  }
}
class StagingStack extends TerraformStack {
  //app1: kubernetes.Deployment;
  namespace = "default";
  regCred: kubernetes.Secret
  kaiser_namespace: kubernetes.Namespace;
  // ============================================================third parties==========================================================================
  // Kafka
  kafka_helm: Release;
  // keycloak
  //keycloak_helm: Release;
  ingress_controller_helm: Release;
  // mongodb
  mongodb_helm: Release;
  // redis
  redis_helm: Release;
  // mqtt
  mqtt_helm: Release;
  MQTT_ingress_DNS_record='develop.mqtt.dipal.ru'
  mqtt_ingress:kubernetes.IngressV1
  // =============================================================kaiser================================================================================
  // pyrador
  pyrador_deployment: kubernetes.Deployment
  pyrador_configmap: kubernetes.ConfigMap
  pyrador_secret: kubernetes.Secret
  pyrador_service: kubernetes.Service
  pyrador_ingress:kubernetes.IngressV1
  pyrador_ingress_DNS_record='develop.auth.dipal.ru'
  // iguana
  iguana_deployment: kubernetes.Deployment
  iguana_configmap: kubernetes.ConfigMap
  iguana_secret: kubernetes.Secret
  iguana_service: kubernetes.Service
  iguana_ingress: kubernetes.IngressV1
  iguana_ingress_DNS_record='develop.dipal.ru'
  // zoo
   zoo_deployment: kubernetes.Deployment
   zoo_configmap: kubernetes.ConfigMap
   zoo_secret: kubernetes.Secret
   zoo_service: kubernetes.Service
   zoo_ingress: kubernetes.IngressV1
  zoo_ingress_DNS_record='develop.panel.dipal.ru'
  // // goos
  goos_deployment: kubernetes.Deployment
  goos_configmap: kubernetes.ConfigMap
  goos_secret: kubernetes.Secret
  // // pigeons
  pigeons_deployment: kubernetes.Deployment
  pigeons_configmap: kubernetes.ConfigMap
  pigeons_secret: kubernetes.Secret
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
    //-------------------------------------------------------------------------------------------------------------------
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
        },
        {
          name: 'auth.password',
          value: 'PoI456ZxC'
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
    this.ingress_controller_helm=this.kafka_helm = new Release(this, 'ingress-controller', {
      name: "ingress-controller",
      repository: "https://charts.bitnami.com/bitnami",
      chart: "nginx-ingress-controller",

    })
    //-------------------------------------------------------------------------------------------------------------------
    this.mqtt_helm = new Release(this, 'mqtt', {
      name: "mqtt",
      repository: "https://k8s-at-home.com/charts/",
      chart: "mosquitto",

    })
    this.mqtt_ingress= new kubernetes.IngressV1(this,'mqtt-ingress',{
      metadata:{
        name:'mqtt-ingress',
        namespace:this.namespace,
        annotations:{
          'kubernetes.io/ingress.class': 'nginx'
        },
      },
      spec:{
        rule:[
          {
            host:this.MQTT_ingress_DNS_record,
            http:{
              path:[
                {
                  path:"/",
                  backend:{
                    service:{
                      name:'mqtt-mosquitto',
                      port:{
                        number:1883
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
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
    this.zoo_configmap=new kubernetes.ConfigMap(this,"zoo-configmap",{
      metadata: {
        labels: {
          'io.kompose.service': 'zoo-service'
        },
        name: 'zoo-configmap',
        namespace: this.namespace
      },
      data: {
        'APP_PORT': '6000',
        'REDIS_HOST': 'redis-master',
        'REDIS_PORT': '6378',
        'KAFKA_HOST': 'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID': 'zoo',
        'KAFKA_GROUP_ID': 'zoo'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.zoo_secret=new kubernetes.Secret(this,"zoo-secret",{
      metadata: {
        name: "zoo-secret",
        namespace: this.namespace,
      },
      type: 'Opaque',
      data: {

         
        'AUTH_KEY': 'TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF5ZFlZM2o2Skh3Qmd2aUZOd1o2bit0aHg5ZURjNTQ3VFJ1RlZySUNiZ3FPL3BjazZBb1FGTGZBWlB0azhZaHZtcVdjVWt0b1AwdUd2MXlkSWFSY1l4QVVGK29zZW1iWUlpc0h3cGh3K1lJaFJZdnFsbU5PeGNjd21nU0lFNlRpTlBjNFNVcDNrSG03aFdaRU9QY3VoREVzNEVTYWdyTGRCR2U1Qnl0dVhrZGNCUTVpeXFRU3lwdHlOY1I4enEzdGZ5cE9hbzZZckwzeWFRMjJaOEQvclVWRDA5SkNUUzBFaWdsT3c0S1M2TlJ0V05UeDhJdE1JMEZScWpLcWxqZDR2b1dEVm1rOTA2QzRjN0psV29VdG1QVDB4ZndYRlErN1A4bldWbXNJQ0VGYjRDN3ZzRlVKT2Jld2Q2cWZyY2MvRVdNOEtpZE9wUldjOGN6UHZEQkUwZlFJREFRQUI=',
        'REDIS_PASSWORD': 'PoI456ZxC'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.zoo_deployment=new kubernetes.Deployment(this,"zoo-deployment",{
      metadata: {
        annotations: {
          'kompose.cmd': 'kompose convert',
          'kompose.version': '1.26.1 (a9d05d509)'
        },
        labels: {
          'io.kompose.service': 'zoo'
        },
        name: 'zoo',
        namespace: this.namespace
      },
      spec: {
        replicas: '1',
        selector: {
          matchLabels: {
            'io.kompose.service': 'zoo'
          }
        },
        template: {
          metadata: {
            annotations: {
              'kompose.cmd': 'kompose convert',
              'kompose.version': '1.26.1 (a9d05d509)'
            },
            labels: {
              'io.kompose.service': 'zoo'
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
                    name: 'APP_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'APP_PORT'
                      }

                    }
                  },
                  {
                    name: 'REDIS_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'REDIS_HOST'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'REDIS_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'KAFKA_HOST'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'KAFKA_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_CLIENT_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'KAFKA_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_GROUP_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'zoo-configmap',
                        key: 'KAFKA_GROUP_ID'
                      }

                    }
                  },
                  {
                    name: 'AUTH_KEY',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'zoo-secret',
                        key: 'AUTH_KEY'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PASSWORD',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'zoo-secret',
                        key: 'REDIS_PASSWORD'
                      }

                    }
                  }
                ],
                image: '10.1.0.14:8081/comfortech/zoo_develop:v29',
                name: 'zoo',
                port: [
                  {
                    containerPort: 6000
                  }
                ]
              },

            ]
          }
        }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.zoo_service=new kubernetes.Service(this,"zoo-service",{
      metadata: {
        name: 'zoo-service',
        annotations: {
          "kompose.cmd": "kompose convert",
          "kompose.version": "1.26.1 (a9d05d509)"
        },
        labels: {
          "io.kompose.service": "zoo"
        }
      },
      spec: {
        port: [
          {
            name: "6001",
            port: 6001,
            targetPort: "6000"
          },

        ],
        type:"ClusterIP",
        selector: { "io.kompose.service": "zoo" }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.zoo_ingress=new kubernetes.IngressV1(this,"zoo-ingress",{
      metadata:{
        name:'zoo-ingress',
        namespace:this.namespace,
        annotations:{
          'kubernetes.io/ingress.class': 'nginx'
        },
      },
      spec:{
        rule:[
          {
            host:this.zoo_ingress_DNS_record,
            http:{
              path:[
                {
                  path:"/",
                  backend:{
                    service:{
                      name:'zoo-service',
                      port:{
                        number:6001
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
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
        'REDIS_HOST': 'redis-master',
        'REDIS_PORT': '6378',
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
        'REDIS_PASSWORD': 'PoI456ZxC'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pyrador_deployment = new kubernetes.Deployment(this, 'pyradorDeplyment', {
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
                image: '10.1.0.14:8081/comfortech/pyrador_develop:v30',
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
        type:"ClusterIP",
        selector: { "io.kompose.service": "pyrador" }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pyrador_ingress= new kubernetes.IngressV1(this,'pyrador-ingress',{
      metadata:{
        name:'pyrador-ingress',
        namespace:this.namespace,
        annotations:{
          'kubernetes.io/ingress.class': 'nginx'
        },
      },
      spec:{
        rule:[
          {
            host:this.pyrador_ingress_DNS_record,
            http:{
              path:[
                {
                  path:"/",
                  backend:{
                    service:{
                      name:'pyrador-service',
                      port:{
                        number:5001
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
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
        'REDIS_HOST': 'redis-master',
        'VAULT_HOST': 'http://localhost',
        'VAULT_PORT': '8200',
        'REDIS_PORT': '6378',
        'KAFKA_HOST': 'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID': 'comfortech-dataland',
        'KAFKA_GROUP_ID': 'comfortech-dataland',
        'KEYCLOAK_BASE_URI': 'https://auth.techpal.ru',
        'KEYCLOAK_PORT': '8080',
        'KEYCLOAK_REALM': 'comfortech_staging',
        'KEYCLOAK_GRANT_TYPE': 'password',
        'NEXT_TRY_TIME': '60000',
        'OTP_EXPIRATION_TIME': '60000',
        'BILLING_BASE_URL':'https://api.uut-telecom.ru/api/v1.0'
      }
    });
    //-------------------------------------------------------------------------------------------------------------------
    this.crow_secret = new kubernetes.Secret(this, 'crowSecret', {
      metadata: {
        name: "crow-secret",
        namespace: this.namespace,
      },
      type: 'Opaque',
      data: {
        'MONGO_PASSWORD': 'PoI456ZxC',
        'REDIS_PASSWORD': 'PoI456ZxC',
        'VAULT_ROOT_TOKEN': 'bm90aGluZw==',
        'VAULT_TOKEN_PATH': 'dmF1bHQvZGF0YS92YXVsdF9yb290X3Rva2VuLmtleQ==',
        'VAULT_KEYS_PATH': 'dmF1bHQvZGF0YS9zZWFsaW5nX2tleXMua2V5',
        'KEYCLOAK_CLIENT_ACCOUNT_ID': '0d68a12c-7e3e-4995-8604-bc7eb3327fd4',
        'KEYCLOAK_CLIENT_ID': 'admin-cli',
        'KEYCLOAK_LOCAL_CLIENT_ID': 'comfortech',
        'KEYCLOAK_USERNAME': 'admin',
        'KEYCLOAK_PASSWORD': 'PoI456ZxC',
        'SECURITY_KEY':'971ebba1602e952acd7a549ca3826e41',
        
      }
    });
    //-------------------------------------------------------------------------------------------------------------------
    this.crow_deployment = new kubernetes.Deployment(this, 'crowDeployment', {
      
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
            hostAliases:[
              {
                ip:'10.1.0.8',
                hostnames:[
                  "auth.techpal.ru"
                ]
              }
            ],
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
                    name: 'NEXT_TRY_TIME',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'NEXT_TRY_TIME'
                      }

                    }
                  },
                  {
                    name: 'OTP_EXPIRATION_TIME',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'OTP_EXPIRATION_TIME'
                      }

                    }
                  },
                  {
                    name: 'BILLING_BASE_URL',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'crow-configmap',
                        key: 'BILLING_BASE_URL'
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
                    name: 'SECURITY_KEY',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'crow-secret',
                        key: 'SECURITY_KEY'
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
                image:'10.1.0.14:8081/comfortech/crow_develop:v88',
                name:'crow'              
              }
            ],
            restartPolicy:'Always'
          }
        }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.iguana_configmap=new kubernetes.ConfigMap(this,'iguana-configmap',{
      metadata:{
        labels:{
          "io.kompose.service":"iguana-service"
        },
        name:"iguana-configmap",
        namespace:this.namespace
      },
      data:{
        'APP_PORT':'2000',
        'REDIS_HOST':'redis-master',
        'REDIS_PORT':'6378',
        'KAFKA_HOST':'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID':'iguana',
        'KAFKA_GROUP_ID':'iguana'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.iguana_secret=new kubernetes.Secret(this,'iguana-secret',{
      metadata:{
        name:'iguana-secret',
        namespace:this.namespace
      },
      type:'Opaque',
      data:{
        'AUTH_KEY':'TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF5ZFlZM2o2Skh3Qmd2aUZOd1o2bit0aHg5ZURjNTQ3VFJ1RlZySUNiZ3FPL3BjazZBb1FGTGZBWlB0azhZaHZtcVdjVWt0b1AwdUd2MXlkSWFSY1l4QVVGK29zZW1iWUlpc0h3cGh3K1lJaFJZdnFsbU5PeGNjd21nU0lFNlRpTlBjNFNVcDNrSG03aFdaRU9QY3VoREVzNEVTYWdyTGRCR2U1Qnl0dVhrZGNCUTVpeXFRU3lwdHlOY1I4enEzdGZ5cE9hbzZZckwzeWFRMjJaOEQvclVWRDA5SkNUUzBFaWdsT3c0S1M2TlJ0V05UeDhJdE1JMEZScWpLcWxqZDR2b1dEVm1rOTA2QzRjN0psV29VdG1QVDB4ZndYRlErN1A4bldWbXNJQ0VGYjRDN3ZzRlVKT2Jld2Q2cWZyY2MvRVdNOEtpZE9wUldjOGN6UHZEQkUwZlFJREFRQUI=',
        'REDIS_PASSWORD': 'PoI456ZxC',
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.iguana_deployment=new kubernetes.Deployment(this,'iguana-deployment',{
      metadata: {
        annotations: {
          'kompose.cmd': 'kompose convert',
          'kompose.version': '1.26.1 (a9d05d509)'
        },
        labels: {
          'io.kompose.service': 'iguana'
        },
        name: 'iguana',
        namespace: this.namespace
      },
      spec:{
        replicas: '1',
        selector: {
          matchLabels: {
            'io.kompose.service': 'iguana'
          }
        },
        template:{
          metadata: {
            annotations: {
              'kompose.cmd': 'kompose convert',
              'kompose.version': '1.26.1 (a9d05d509)'
            },
            labels: {
              'io.kompose.service': 'iguana'
            }
          },
          spec:{
            imagePullSecrets: [
              {
                name: 'regcred'
              }
            ],
            container:[
              {
              env:[
                {
                  name: 'App_PORT',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'APP_PORT'
                    }
                  }
                },
                {
                  name: 'REDIS_HOST',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'REDIS_HOST'
                    }
                  }
                },
                {
                  name: 'REDIS_PORT',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'REDIS_PORT'
                    }
                  }
                },
                {
                  name: 'KAFKA_HOST',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'KAFKA_HOST'
                    }
                  }
                },
                {
                  name: 'KAFKA_PORT',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'KAFKA_PORT'
                    }
                  }
                },
                {
                  name: 'KAFKA_CLIENT_ID',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'KAFKA_CLIENT_ID'
                    }
                  }
                },
                {
                  name: 'KAFKA_GROUP_ID',
                  valueFrom: {
                    configMapKeyRef:
                    {
                      name: 'iguana-configmap',
                      key: 'KAFKA_GROUP_ID'
                    }
                  }
                },
                {
                  name: 'AUTH_KEY',
                  valueFrom: {
                    secretKeyRef:
                    {
                      name: 'iguana-secret',
                      key: 'AUTH_KEY'
                    }
                  }
                },
                {
                  name: 'REDIS_PASSWORD',
                  valueFrom: {
                    secretKeyRef:
                    {
                      name: 'iguana-secret',
                      key: 'REDIS_PASSWORD'
                    }
                  }
                },
              ],
              image:'10.1.0.14:8081/comfortech/iguana_develop:v64',
              name:'iguana',
              port: [
                {
                  containerPort: 2000
                }
              ]
              }
            ],
          }
        }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.iguana_service=new kubernetes.Service(this,'iguana-service',{
      metadata: {
        name: 'iguana-service',
        annotations: {
          "kompose.cmd": "kompose convert",
          "kompose.version": "1.26.1 (a9d05d509)"
        },
        labels: {
          "io.kompose.service": "iguana"
        }
      },
      spec: {
        port: [
          {
            name: "2000",
            port: 2001,
            targetPort: "2000"
          },

        ],
        type:"ClusterIP",
        selector: { "io.kompose.service": "iguana" }
      }
    })

    //-------------------------------------------------------------------------------------------------------------------
    this.iguana_ingress=new kubernetes.IngressV1(this,'iguana-ingress',{
      metadata:{
        name:'iguana-ingress',
        namespace:this.namespace,
        annotations:{
          'kubernetes.io/ingress.class': 'nginx'
        },
      },
      spec:{
        rule:[
          {
            host:this.iguana_ingress_DNS_record,
            http:{
              path:[
                {
                  path:"/",
                  backend:{
                    service:{
                      name:'iguana-service',
                      port:{
                        number:2001
                      }
                    }
                  }
                }
              ]
            }
          }
        ]
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.goos_configmap=new kubernetes.ConfigMap(this,'goose-configmap',{
      metadata: {
        labels: {
          'io.kompose.service': 'goose-service'
        },
        name: 'goose-configmap',
        namespace: this.namespace
      },
      data:{
        'REDIS_HOST': 'redis-master',
        'REDIS_PORT': '6378',
        'KAFKA_HOST': 'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID': 'goose-consumer',
        'KAFKA_GROUP_ID': 'goose-consumer',
        'MQTT_HOST': 'mqtt',
        'MQTT_PORT': '1883',
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.goos_secret=new kubernetes.Secret(this,'goose-secret',{
      metadata: {
        name: "goose-secret",
        namespace: this.namespace,
      },
      type: 'Opaque',
      data: {
        'REDIS_PASSWORD': 'PoI456ZxC',
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.goos_deployment=new kubernetes.Deployment(this,'goose-deployment',{
      metadata: {
        name: "goose",
        annotations:{
          "kompose.cmd":"kompose convert",
          "kompose.version":"1.26.1 (a9d05d509)"
        },
        labels:{
          "io.kompose.service":"goose"
        },
        namespace:this.namespace
      },
      spec: {
        
        replicas:'1',
        selector:{
          matchLabels:{'io.kompose.service':'goose'}
        },
        template:{
          metadata:{
            annotations:{
              'kompose.cmd':'kompose convert',
              'kompose.version':'1.26.1 (a9d05d509)'
            },
            labels:{
              'io.kompose.service':'goose'
            }
          },
          spec:{
            hostAliases:[
              {
                ip:'10.1.0.8',
                hostnames:[
                  "auth.techpal.ru"
                ]
              }
            ],
            imagePullSecrets:[
              {
                name:'regcred'
              }
            ],
            container:[
              {
                env:[
                  {
                    name: 'REDIS_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'REDIS_HOST'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'REDIS_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'KAFKA_HOST'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'KAFKA_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_CLIENT_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'KAFKA_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_GROUP_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'KAFKA_GROUP_ID'
                      }

                    }
                  },
                  {
                    name: 'MQTT_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'MQTT_HOST'
                      }

                    }
                  },
                  {
                    name: 'MQTT_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'goose-configmap',
                        key: 'MQTT_PORT'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PASSWORD',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'goose-secret',
                        key: 'REDIS_PASSWORD'
                      }

                    }
                  }
                ],
                image:'10.1.0.14:8081/comfortech/goose_develop:v40',
                name:'goose'              
              }
            ],
            restartPolicy:'Always'
          }
        }
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pigeons_configmap=new kubernetes.ConfigMap(this,'pigeons-configmap',{
      metadata:{
        labels:{
          "io.kompose.service":"pigeons-service"
        },
        name:"pigeons-configmap",
        namespace:this.namespace
      },
      data:{
        'REDIS_HOST':'redis-master',
        'REDIS_PORT':'6378',
        'KAFKA_HOST':'kafka',
        'KAFKA_PORT': '9092',
        'KAFKA_CLIENT_ID':'pigeons',
        'KAFKA_GROUP_ID':'pigeons',
        'NODE_TLS_REJECT_UNAUTHORIZED':'0'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pigeons_secret=new kubernetes.Secret(this,'pigeons-secret',{
      metadata:{
        name:'pigeons-secret',
        namespace:this.namespace
      },
      type:'Opaque',
      data:{
        'REDIS_PASSWORD': 'PoI456ZxC',
        'EMAIL_FROM': 'Comfortel <comfortec@yandex.ru>',
        'EMAIL_USER': 'comfortec',
        'EMAIL_PASS': 'orvavpirmuiqqrip',
        'EMAIL_HOST': 'smtp.yandex.ru',
        'EMAIL_PORT': '465',
        'SMS_BASE_URL': 'https://smpp.comfortel.pro:13013',
        'SMS_PASS': 'Chuichi2aiti',
        'SMS_USER': 'techpal',
        'SMS_SENDER': 'Comfortel',
        'FIREBASE_ACCOUNT_TYPE': 'service_account',
        'FIREBASE_ACCOUNT_PROJECT_ID': 'comfortech-12a15',
        'FIREBASE_ACCOUNT_PRIVATE_KEY_ID': '481c511d487607199bf67ebed2f6f3e555597b41',
        'FIREBASE_ACCOUNT_PRIVATE_KEY': '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCdOYq29CxrkTNt\n1XfIxLjnR6yUsemRHYoIho1FYxruP5p0957ZVmdv5AXbwOmecTYXwy8FBlyVFNBE\na7TKDEP1BMlBK7MwN23431DDjKYx/YQjksDb2XAz+ykosv0A3G0r9nJjr8iPmDEa\nwXK3U5ISdX0yMW/kSfWkQ3kBCgdL1G1FtWQBuxp83EHAgv+GW3wcIr4srZmOHjit\nI2BEwfzUhZ/GpMg7sQkItzJ33tTmsuMownas6hknKCqRVr8DzZ9JZZ2rLaQZvaUN\nskd+/QlyejHN9APes0Cc1kXEbzJU1a3Mgm9fkWUCtewth54JmbZn+sQsiBvrAg+x\n8IPALoEpAgMBAAECggEAHWgYjZEcaM8a7Sle0t6Wje2ONi6TlsiNW3xdGnQHorWj\nPErfO1vJk3g0704E9BVNLoMbfYdb1Cd1L8LsaNkD8eVABjA3/uXzK/gKyVR6dkGq\nUCP/7e7cqWBJ6bqWjy1rPuyEpygG7XKkBpLVk7vuB4VRkgyEltCNgPh8vqjDRheN\nTcweIH4oEXTgYhJ0Krx9zU/ZYxchc/S6g/GFJNVSXUQAL31U4GzqP857sSAnQ2OT\n4Ue6JYGTgSPd3ogWOXJGuxn+9Mb+IwapV8T8KADBMZhRqkD9YeKb8s5/qo0KQBCV\naSmL+ZYV7KkHZWie26hhTTvqj/Ll92+cyFF/LfIHzQKBgQDXie9+HslGvdVQFayD\nIfnZD3DaGn7y+FNUOAmw8jMLhsy7eutHgHmpOwW+ctJSlzdrP6lbFhFxdiZ6ok8L\nmZFeZJTv5fsNCrGoQ9yLnZCnrCEJ2BUgSCyS0TTem3p2+4tQgZcbzj32fI7KR5v8\n8BQcK1fnBgZ6XztMLj9qFv1RxQKBgQC6vTs8PMZCoaNici+nT7/KLmepkEyz9cJn\nQp2uCohmy0zAZ9Me7DSxLnaIOom1zmBJWIK/48/41FH2eVxyH5Pd1F5wIjrTX5/Y\nAFpX2Rz0AKMn4BhXEU1umuxShQRQ5aUJO0xf/x2h5TdKcnlzuMYHDfBFr8WuN0/H\nXSdS2DRcFQKBgHXCWOTRMSrDQK42iUBD6dubwg6Hd2CMKArVawYP7a+YgHbV24H/\nQXkiVCsPVLXnBFJGP+MSFYmmAbPyxbkSuAeYcH75acZgV1wVZ4OoHIZfVtWoBzLR\n+/hi8L3GuIwVNrJPex2n+taWivUdVq5FBNe3HpmMAzIMobsncWInGVP5AoGBAKGR\nXnIE50j5T0K7Jw3syzTkJ56nEiZWSWhMU98kj9XYqkSC0ECeAA0Y9Udy1nlt4RM0\nuJPMSMGy+mN1p426UpaIy1jb1OfTgZpC2+fMGufmsUOr+YNDnipHcpcHLa/MsZkm\nLDOWqI3No6QPHZQJV5T881ln9nKAus70gzSDifHtAoGBAI6L/8RXh/9TSqBs8QXV\nyWYIPrOfAVXQnbxMSlbFP/9Y4VDyDOtWLU577VEPpzzr9on54D6grcxH50kyruA1\np0nio67uyRdgGqOCbEKDpeI7fDWLZ4DeCcaGn8i78gXylSey6rG5NTbKCqSDMDlX\nKzWiIoOL1qfCWhjHAWzY52Pb\n-----END PRIVATE KEY-----\n',
        'FIREBASE_ACCOUNT_CLIENT_EMAIL': 'firebase-adminsdk-2mrcb@comfortech-12a15.iam.gserviceaccount.com',
        'FIREBASE_ACCOUNT_CLIENT_ID': '104778641386557489050',
        'FIREBASE_ACCOUNT_AUTH_URI': 'https://accounts.google.com/o/oauth2/auth',
        'FIREBASE_ACCOUNT_TOKEN_URI': 'https://oauth2.googleapis.com/token',
        'FIREBASE_ACCOUNT_AUTH_PROVIDER_X509_CERT_ULL': 'https://www.googleapis.com/oauth2/v1/certs',
        'FIREBASE_ACCOUNT_CLIENT_X509_CERT_URL': 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-2mrcb%40comfortech-12a15.iam.gserviceaccount.com',
        'FIREBASE_DEFAULT_MESSAGE_TITLE': 'Comfortech',
        'FIREBASE_DEFAULT_MESSAGE_BODY': 'Empty message',
        'FIREBASE_DEFAULT_MESSAGE_IMAGE_URL': 'https://sun1-26.userapi.com/s/v1/if1/2Dhrl9gqlWW7XVRbXiBRdtduvtw4PTiYRE0K9A9qVfypNzoERhBxUj_ch5VP6-RBWSyvQ9_q.jpg?size=400x0&quality=96&crop=108,115,484,484&ava=1',
        'FIREBASE_REGISTRATION_TOKEN': 'AIzaSyCf5LhHwWcWWgjKCHv1I32lko6QusPty-I'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pigeons_deployment=new kubernetes.Deployment(this,'pigeons-deployment',{
      metadata: {
        name: "pigeons",
        annotations:{
          "kompose.cmd":"kompose convert",
          "kompose.version":"1.26.1 (a9d05d509)"
        },
        labels:{
          "io.kompose.service":"pigeons"
        },
        namespace:this.namespace
      },
      spec: {
        
        replicas:'1',
        selector:{
          matchLabels:{'io.kompose.service':'pigeons'}
        },
        template:{
          metadata:{
            annotations:{
              'kompose.cmd':'kompose convert',
              'kompose.version':'1.26.1 (a9d05d509)'
            },
            labels:{
              'io.kompose.service':'pigeons'
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
                    name: 'REDIS_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'REDIS_HOST'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'REDIS_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_HOST',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'KAFKA_HOST'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_PORT',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'KAFKA_PORT'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_CLIENT_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'KAFKA_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'KAFKA_GROUP_ID',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'KAFKA_GROUP_ID'
                      }

                    }
                  },
                  {
                    name: 'NODE_TLS_REJECT_UNAUTHORIZED',
                    valueFrom: {
                      configMapKeyRef:
                      {
                        name: 'pigeons-configmap',
                        key: 'NODE_TLS_REJECT_UNAUTHORIZED'
                      }

                    }
                  },
                  {
                    name: 'REDIS_PASSWORD',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'REDIS_PASSWORD'
                      }

                    }
                  },
                  {
                    name: 'EMAIL_FROM',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'EMAIL_FROM'
                      }

                    }
                  },
                  {
                    name: 'EMAIL_USER',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'EMAIL_USER'
                      }

                    }
                  },
                  {
                    name: 'EMAIL_PASS',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'EMAIL_PASS'
                      }

                    }
                  },
                  {
                    name: 'EMAIL_HOST',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'EMAIL_HOST'
                      }

                    }
                  },
                  {
                    name: 'EMAIL_PORT',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'EMAIL_PORT'
                      }

                    }
                  },
                  {
                    name: 'SMS_BASE_URL',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'SMS_BASE_URL'
                      }

                    }
                  },
                  {
                    name: 'SMS_SENDER',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'SMS_SENDER'
                      }

                    }
                  },
                  {
                    name: 'SMS_USER',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'SMS_USER'
                      }

                    }
                  },
                  {
                    name: 'SMS_PASS',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'SMS_PASS'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_TYPE',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_TYPE'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_PROJECT_ID',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_PROJECT_ID'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_PRIVATE_KEY_ID',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_PRIVATE_KEY_ID'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_PRIVATE_KEY',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_PRIVATE_KEY'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_CLIENT_EMAIL',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_CLIENT_EMAIL'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_CLIENT_ID',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_CLIENT_ID'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_AUTH_URI',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_AUTH_URI'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_TOKEN_URI',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_TOKEN_URI'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_AUTH_PROVIDER_X509_CERT_ULL',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_AUTH_PROVIDER_X509_CERT_ULL'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_ACCOUNT_CLIENT_X509_CERT_URL',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_ACCOUNT_CLIENT_X509_CERT_URL'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_DEFAULT_MESSAGE_TITLE',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_DEFAULT_MESSAGE_TITLE'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_DEFAULT_MESSAGE_BODY',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_DEFAULT_MESSAGE_BODY'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_DEFAULT_MESSAGE_IMAGE_URL',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_DEFAULT_MESSAGE_IMAGE_URL'
                      }

                    }
                  },
                  {
                    name: 'FIREBASE_REGISTRATION_TOKEN',
                    valueFrom: {
                      secretKeyRef:
                      {
                        name: 'pigeons-secret',
                        key: 'FIREBASE_REGISTRATION_TOKEN'
                      }

                    }
                  },
                ],
                image:'10.1.0.14:8081/comfortech/pigeons_develop:v38',
                name:'pigeons'              
              }
            ],
            restartPolicy:'Always'
          }
        }
      }
    })

    // define resources here
  }
}
const stagingApp = new App();
const prodApp = new App();

  new StagingStack(stagingApp, "comfortech_staging");
  new ProdStack(prodApp, "comfortech_prod");

  stagingApp.synth();
  prodApp.synth();
