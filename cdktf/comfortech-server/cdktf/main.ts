import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import * as kubernetes from "@cdktf/provider-kubernetes"
import * as path from "path"

class MyStack extends TerraformStack {
  app1: kubernetes.Deployment;

  constructor(scope: Construct, name: string) {
    super(scope, name);

    
    new kubernetes.KubernetesProvider(this, 'kind', {
      configPath: path.join(__dirname, './kubeconfig.yaml'),
    })
    this.app1=new kubernetes.Deployment(this, 'deployment', {
      metadata: {
        labels: {
          app: 'myapp',
          component: 'frontend',
          environment: 'dev',
        },
        name: 'myapp',
      },
      spec: {
        replicas: '1',
        selector: {
          matchLabels: {
            app: 'myapp',
            component: 'frontend',
            environment: 'dev',
          },
        },
        template: {
          metadata: {
            labels: {
              app: 'myapp',
              component: 'frontend',
              environment: 'dev',
            },
          },
          spec: {
            container: [
              {
                image: 'nginx:latest',
                name: 'frontend',
              },
            ],
          },
        },
      },
    })

    // define resources here
  }
}

const app = new App();
new MyStack(app, "cdktf");
app.synth();
