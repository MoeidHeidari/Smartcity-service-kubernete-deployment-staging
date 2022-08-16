import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import * as kubernetes from "@cdktf/provider-kubernetes"
import { HelmProvider } from "./.gen/providers/helm";
import * as path from "path"
import { Release } from "./.gen/providers/helm";
class MyStack extends TerraformStack {
  //app1: kubernetes.Deployment;
  namespace="default";
  regCred:kubernetes.Secret
  kaiser_namespace:kubernetes.Namespace;
  // ============================================================third parties==========================================================================
  // Kafka
  kafka_helm:Release;
  // keycloak
  keycloak_helm:Release;
  // mongodb
  // redis
  redis_helm:Release;
  // mqtt
  // =============================================================kaiser================================================================================
  // pyrador
  pyrador_deployment:kubernetes.Deployment
  pyrador_configmap:kubernetes.ConfigMap
  pyrador_secret:kubernetes.Secret
  //pyrador_service:kubernetes.Service
  // iguana
  // zoo
  // goos
  // pigeons
  // crow



  constructor(scope: Construct, name: string) {
    super(scope, name);
    
    
    new kubernetes.KubernetesProvider(this, 'kind', {
      configPath: path.join(__dirname, './kubeconfig.yaml'),
    })
    //-------------------------------------------------------------------------------------------------------------------

    new HelmProvider(this,'helm',{
      kubernetes:
        {
          configPath: path.join(__dirname, './kubeconfig.yaml'),
        }
      
    })
    

    this.redis_helm=new Release(this,'redis',{
      name: "redis",
      repository: "https://charts.bitnami.com/bitnami",
      chart: "redis",
      set:[
        {
          name:'master.containerPorts.redis',
          value:'6378'
        },
        {
          name:'master.service.ports.redis',
          value:'6378'
        },
        {
          name:'replica.containerPorts.redis',
          value:'6378'
        },
        {
          name:'replica.service.ports.redis',
          value:'6378'
        },
        {
          name:'replica.replicaCount',
          value:'1'
        }
        
      ]
      
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.kafka_helm=new Release(this,'kafka',{
      name: "kafka",
      repository: "https://charts.bitnami.com/bitnami",
      chart: "kafka",
      
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.keycloak_helm=new Release(this,'keycloak',{
      name: "keycloak",
      repository: "https://codecentric.github.io/helm-charts",
      chart: "keycloak",
      version:"18.1.1",
      set:[
        {
          name:'extraEnv[0].PROXY_ADDRESS_FORWARDING',
          value:'true'
        }
      ]
      
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.kaiser_namespace=new kubernetes.Namespace(this,'kaiser',{
      metadata:{
        name:'kaiser'
      },
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.regCred=new kubernetes.Secret(this,'regcred',{
      metadata:{
        name:"regcred",
        namespace:this.namespace,
      },
      type:'kubernetes.io/dockerconfigjson',
      data:{
        '.dockerconfigjson':`{
          "auths": {
            "10.1.0.14:8081": {
              "auth": "Y29tZm9ydGVjaDpQb0k0NTZaeEM="
            }
          }
        }`
      }
    })
    
    //-------------------------------------------------------------------------------------------------------------------
    
    this.pyrador_configmap=new kubernetes.ConfigMap(this,"pyradorConfigmap",{
      metadata:{
        labels:{
          'io.kompose.service':'pyrador-service'
        },
        name:'pyrador-configmap',
        namespace:this.namespace
      },
      data:{
        'APP_PORT':'5000',
        'REDIS_HOST':'redis',
        'REDIS_PORT':this.redis_helm.set.get(0).value,
        'KAFKA_HOST':'kafka',
        'KAFKA_PORT':'9092',
        'KAFKA_CLIENT_ID':'pyrador',
        'KAFKA_GROUP_ID':'pyrador'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pyrador_secret=new kubernetes.Secret(this,'pyradorSecret',{
      metadata:{
        name:"pyrador-secret",
        namespace:this.namespace,
      },
      type:'Opaque',
      data:{
        'AUTH_KEY':'TUlJQklqQU5CZ2txaGtpRzl3MEJBUUVGQUFPQ0FROEFNSUlCQ2dLQ0FRRUF5ZFlZM2o2Skh3Qmd2aUZOd1o2bit0aHg5ZURjNTQ3VFJ1RlZySUNiZ3FPL3BjazZBb1FGTGZBWlB0azhZaHZtcVdjVWt0b1AwdUd2MXlkSWFSY1l4QVVGK29zZW1iWUlpc0h3cGh3K1lJaFJZdnFsbU5PeGNjd21nU0lFNlRpTlBjNFNVcDNrSG03aFdaRU9QY3VoREVzNEVTYWdyTGRCR2U1Qnl0dVhrZGNCUTVpeXFRU3lwdHlOY1I4enEzdGZ5cE9hbzZZckwzeWFRMjJaOEQvclVWRDA5SkNUUzBFaWdsT3c0S1M2TlJ0V05UeDhJdE1JMEZScWpLcWxqZDR2b1dEVm1rOTA2QzRjN0psV29VdG1QVDB4ZndYRlErN1A4bldWbXNJQ0VGYjRDN3ZzRlVKT2Jld2Q2cWZyY2MvRVdNOEtpZE9wUldjOGN6UHZEQkUwZlFJREFRQUI=',
        'REDIS_PASSWORD':'password'
      }
    })
    //-------------------------------------------------------------------------------------------------------------------
    this.pyrador_deployment=new kubernetes.Deployment(this,'pyradorDeplyment',{
      metadata:{
        annotations:{
          'kompose.cmd':'kompose convert',
          'kompose.version':'1.26.1 (a9d05d509)'
        },
        labels:{
          'io.kompose.service':'pyrador'
        },
        name:'pyrador',
        namespace:this.namespace
      },
      spec:{
        replicas:'1',
        selector:{
          matchLabels:{
            'io.kompose.service':'pyrador'
          }
        },
        template:{
          metadata:{
            annotations:{
              'kompose.cmd':'kompose convert',
              'kompose.version': '1.26.1 (a9d05d509)'
            },
            labels:{
              'io.kompose.service':'pyrador'
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
                    name:'App_PORT',
                    valueFrom:{
                      configMapKeyRef:
                        {
                          name:'pyrador-configmap',
                          key:'APP_PORT'
                        }
                      
                    }
                  },
                  {
                    name:'REDIS_HOST',
                    valueFrom:{
                      configMapKeyRef:
                        {
                          name:'pyrador-configmap',
                          key:'REDIS_HOST'
                        }
                      
                    }
                  },
                  {
                    name:'REDIS_PORT',
                    valueFrom:{
                      configMapKeyRef:
                        {
                          name:'pyrador-configmap',
                          key:'REDIS_PORT'
                        }
                      
                    }
                  },
                  {
                    name:'KAFKA_HOST',
                    valueFrom:{
                      configMapKeyRef:
                        {
                          name:'pyrador-configmap',
                          key:'KAFKA_HOST'
                        }
                      
                    }
                  },
                  {
                    name:'KAFKA_PORT',
                    valueFrom:{
                      configMapKeyRef:
                        {
                          name:'pyrador-configmap',
                          key:'KAFKA_PORT'
                        }
                      
                    }
                  },
                  {
                    name:'KAFKA_CLIENT_ID',
                    valueFrom:{
                      configMapKeyRef:
                        {
                          name:'pyrador-configmap',
                          key:'KAFKA_CLIENT_ID'
                        }
                      
                    }
                  },
                  {
                    name:'KAFKA_GROUP_ID',
                    valueFrom:{
                      configMapKeyRef:
                        {
                          name:'pyrador-configmap',
                          key:'KAFKA_GROUP_ID'
                        }
                      
                    }
                  },
                  {
                    name:'AUTH_KEY',
                    valueFrom:{
                      secretKeyRef:
                        {
                          name:'pyrador-secret',
                          key:'AUTH_KEY'
                        }
                      
                    }
                  },
                  {
                    name:'REDIS_PASSWORD',
                    valueFrom:{
                      secretKeyRef:
                        {
                          name:'pyrador-secret',
                          key:'REDIS_PASSWORD'
                        }
                      
                    }
                  }
                ],
                image:'10.1.0.14:8081/comfortech/pyrador:v1.0',
                name:'pyrador',
                port:[
                  {
                    containerPort:5000
                  }
                ]
              },
              
            ]
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
