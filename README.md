# Metagroup schema tools

Este conxunto de ferramentas pretende simplificar a validación e o parseado da estrutura json creada no seu momento para [vigotech.org](https://vigotech.org).

Esta estructura de grupos ven definida por un fichero `metagroup.json` (segundo o _schema_ definido en https://vigotech.org/vigotech-schema.json)

Básicamente esta estructura permite definir o Metagrupo (co seu logo, links a redes sociais e fontes de eventos) e os grupos membros de dito metagrupo, cada membro, tambien dispon de fontes definidas de onde estraer informacion dos eventos, videos, etc. Por exemplo (extraido de https://vigotech.org/vigotech.json):

`
....
"phpvigo": {
  "name": "PHPVigo",
  "logo": "https://vigotech.org/images/php_vigo.jpg",
  "links": {
    "web": "http://phpvigo.com/",
    "meetup": "https://www.meetup.com/es-ES/PHPVigo/",
    "twitter": "https://twitter.com/phpvigo",
    "github": "https://github.com/phpvigo",
    "youtube": "https://www.youtube.com/c/phpvigo"
  },
  "events": [
    {
      "type": "meetup",
      "meetupid": "phpvigo"
    }
  ],
  "videos": [
    {
      "type": "youtube",
      "channel_id": "UCzcSOwRc7bfKs9jPehJRNxQ"
    }
  ]
},
....
`

A chave `events` poder ser un obxecto único ou un array de obxectos, que define as fontes de eventos de dito grupo

As fontes posibles actuais son:
* Meetup (via RSS feed): 
  `
  {
    "type": "meetup",
    "meetupid": "AIndustriosa"
  }
  `
  Obtén os eventos desde `https://www.meetup.com/[GROUP ID]/events/rss/`. Debido ás limitacións actuais de Meetup, os eventos pasados non están dispoñibles nesta fonte e `getPrevFromSource(source, options)` devolverá un array baleiro para fontes Meetup.
* Eventbrite: 
  `
  {
    "type": "eventbrite",
    "eventbriteid": "17365087639"
  }
  `
* Json: 
  `
  {
    "type": "json",
    "source": "https://www.python-vigo.es/events.json"
  }
  `
  
Mais info en https://github.com/VigoTech/vigotech.github.io

## Ferramenta

Esta ferramente define 3 obxectos:

### Source
Provee métodos para validar a estructura do json

  * `Source.validate(data, schema)`
  
    `source` é o contido do `metagroup.json`
    `schema` é o contido do `vigotech-schema.json`
  
### Events
Provee métodos para importar e normalizar os próximos das distintas fontes

  * `Events.getEventsEmitter()` obten o _EventEmitter_ do obxecto _Events_, os eventos disparados son:
    
    * _getNextFromSourceInit_ o que se lle pasan os parametros _source_ e _options_
    * _getNextFromSourceCompleted_ o que se lle pasan os parametros _nextEvents_ e _options_
    
    Exemplo de como capturar un evento:
    
    `eventEmitter.on('getNextFromSourceInit', (source, options) => {
        console.log(``Getting upcoming events json for ${options.member.name} from ${source.type}``);
      })
    ` 
  * `getGroupNextEvents(sources, options)` obten todos os eventos (independentemente da fonte) dun grupo, ordeados por data de más próximo a máis lonxano. 
  
  * `getNextFromSource(source, options)` obten os eventos dunha fonte
  
  * `getGroupPrevEvents(sources, options)` obten todos os eventos (independentemente da fonte) pasados dun grupo, ordeados por data de más próximo a máis lonxano. 
    
  * `getPrevFromSource(source, options)` obten os eventos pasado dunha fonte
  
  * `sortByDate(events)`
  
  En todos os casos _options_ é un obxecto no que se pasan elementos que poden precisar cada un dos importadores, por exemplo, o importador de *eventbrite* precisa o _eventbriteToken_ para poder funcionar.
  
  
### Videos
  Provee métodos para importar e normalizar os videos de cada grupo
  
  * `Videos.getEventsEmitter()` obten o _EventEmitter_ do obxecto _Videos_, os eventos disparados son:
        
    * _getVideosFromSourceInit_ o que se lle pasan os parametros _source_ e _options_
    * _getVideosFromSourceCompleted_ o que se lle pasan os parametros _videos_ e _options_
   
  * `getGroupVideos(sources, limit, options)` obten todos os videos (independentemente da fonte) dun grupo. *Método asíncrono*
  
  * `getVideosFromSource(source, limit, options)` obten os videos dunha fonte. *Método asíncrono*
        
      
  En todos os casos _options_ é un obxecto no que se pasan elementos que poden precisar cada un dos importadores, por exemplo, o importador de *youtube* precisa o _youtubeApiKey_ para poder funcionar.
  
  
## Exemplo de importador

  Un exemplo de importador pode atoparse no `prepare-json.js` en https://github.com/VigoTech/vigotech.github.io
  
  Neste ficheiro obtense o seguinte evento de cada grupo e a lista de videos e se xenera un ficheiro `vigotech-generated.json` con esta información engadida o `vigotech.json` para facilitar o seu uso no resto da web.
  
