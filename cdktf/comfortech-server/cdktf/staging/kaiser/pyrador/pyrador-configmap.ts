export interface PyradorConfigMap{
    appPort: number,
    redisHost:string,
    redisPort:number,
    kafkaHost:string,
    kafkaPort:number,
    kafkaClientId:string,
    kafkaGroupId:string
    labels:string[],
    name:string,
    namespace:string
}