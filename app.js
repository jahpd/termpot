// Discussão:
// - usar jquery ou DOM puro?
// DOM puro é mais rápido, mas necessita de mais linhas; jquery é pra quem não sabe programar (realmente eu não sei, sei apenas que tem problemas de segurança), mas não sei como resolvê-los, se você, que lê, sabe mexer bem com isso, sugiro uma abertura fork de DOM.
//
//Testando com jquery
$(document).ready(function(){

    // Inicializações do sistema
    var d = new Date()
    var s = d.format("dd/m/yy hh:mm:ss");
    $("#terminal").Ptty({
	theme: "fallout",
	welcome: "..........................................\n. Virtual machine started at             .\n. "+d+".\n. type <emph>help</emph> for instructions             .\n.........................................."
    })

    // a máquina de áudio
    var runtime = null;

    // uma base de dados dummy
    var environment = {
	tau: "/* Ciclo Trigonométrico completo */\nvar tau = 2*Math.PI;",
    }

    // Submit automático para
    // automatizações na linha de comando
    var submit = function(s){
	var form = $("#terminal").find('form');
        form.find('input[type=text]').val(s);
        form.submit();
    };

    // Lista de ajuda
    var capitalize = function(s){
	var cap = ""
	for(var c in s){
	    cap += s[c].toUpperCase()
	}
	return cap
    }

    $("#sidebar").css("overflow-y", "scroll");

    $("#menu > input").each(function(i, j){
	// Carrege todas páginas de ajuda
	var callback = null;
	if(i <= 3){
	    // Para cada botão, mostre um apenas
	    callback = function(){
		var id = $(this).attr('id')
		$.get(capitalize(id)+".md", function(data){
		    var text = markdown.toHTML(data);
		    $("#control_container").hide()
		    $("#help_container").html(text).show()	 
		});
	     }
	}
	// Lista de comandos
	else if(i >= 4 && i <= 8){
	    callback = function(){
		var id = $(this).attr('id')
		if(id === "play" && !runtime) submit('wavepot');
		submit(id);
	    };
	}
	// habilitar os controles
	else if(i === 9){
	    callback = function(){
		$("#help_container").hide()
		$("#control_container").show();
	    };
	}
	else{
	    callback = function(){
		if(!runtime) submit('wavepot')
		if(!runtime.playing) submit('play')
		setTimeout(function(){ submit("slider(\"gain\", 0, 100)")}, 1000)
		setTimeout(function(){ submit("slider(\"car\", 0, 100)")}, 3000)
		setTimeout(function(){ submit("slider(\"mod\", 0, 100)")}, 5000)
		setTimeout(function(){ submit("sin 440, gain()")}, 6000)		
		setTimeout(function(){ submit("play")}, 7000)
		setTimeout(function(){ submit("gain()* sin 440, sin(110, 1)")}, 20000)
		setTimeout(function(){ submit("gain()* sin 440, sin(110, car())")}, 30000)
		setTimeout(function(){ submit("gain()* sin 440+sin(275,1), sin(110, car())")}, 45000)
		setTimeout(function(){ submit("gain()* sin 440+sin(274, mod()), sin(110, car())")}, 60000)
	    }
	}

	$(this).click(callback)
	
    })

    


    // -----------------------
    // REGISTROS
    // -----------------------
    // Registro de módulos
    var register_module = function(string){
	var parsed = parse(string);
	environment[parsed.name] = parsed.string
	return parsed.name
    }

    register_module("def tmod(f, t) t%(1/f)*f # Utilizado para controlar módulos 'saw' e 'tri' [f - frequencia, t-tempo]")
    register_module("def mute() 0 #Zera processador (isso não significa que nada está sendo processado)")
    register_module("def stereo(fn) fn i for i in [0,1] # Separa audio em dois canais [fn - função]");
    register_module("def sin(f, a) a*Math.sin(tau*f*t) # Retorna uma senoide [f - frequencia, a-amplitude");
    register_module("def sin2(f, a) stereo (i)->sin(f[i] or f, a[i] or a, t) # Retorna uma senoide de dois canais [f - array de frequencias, a - array de amplitudes]")
    register_module("def saw(f, a) (1 - 2 * tmod(f, t))* a  # Retorna uma dente-de-serra [f - frequencia, a - amplitude]")
    register_module("def ramp(f, a) 2*(tmod(f, t)- 1)*a # Retorna uma rampa [f - frequencia, a - amplitude]")
    register_module("def ttri(f,t) Math.abs(1-(2*t*f)%2*2-1) # Utilizado no modulo tri [f - frequencia, a - amplitude]")
    register_module("def tri(f, a) ttri(f, t)*a # Retorna uma onda triangular  [f - frequencia, a - amplitude]")
    register_module("def sqr(f, a) ((t*f % 1/f < 1/f/2) * 2 - 1) * a  # Retorna uma onda quadrada [f - frequencia, a - amplitude]")
    register_module("def pulse(f, a, w) ((t*f % 1/f < 1/f/2*w) * 2 - 1) * a # Retorna uma onda pulsante [f - frequencia, a - amplitude]")
    register_module("def noise(a) a*(Math.random()*2-1) # Retorna um ruído branco [a - amplitude]")
    register_module("def perc(input, head, measure, decay, release) a=nextevent(head,measure,t); b=1/decay; c=1/release; input*Math.exp(-a*b*Math.exp(a*c)) # Cria um envelope percussivo \n e toca em loop")
    register_module("def nextevent(head, measure) (t/head)%measure # Utilizado em perc para controlar sequencia de eventos [head-cabeça de tempo, measure - tamanho do compasso")
    register_module("def test() perc(sin(440,1,t),1,1,0.5,0.15,t) #Uma simples função de teste")
    register_module("def seq(a) a[Math.floor(t%a.length)] # Retorna uma sequencia de valores no tempo [a - array de valores]")
    // ---------------------------
    // FIM REGISTROS
    // ---------------------------


    // --------------------------
    // CONTROLES
    // --------------------------
    var control_vars = []

    // De https://github.com/processing/p5.js/blob/master/src/math/calculation.js
    var map = function(n, start1, stop1, start2, stop2) {
	return ((n-start1)/(stop1-start1))*(stop2-start2)+start2;
    };

    // Adiciona um simples slider jquery
    function jquerySlider($el, min, max){
	return $el.slider({
	    range: "min",
	    animate: true,
	    orientation: "vertical",
	    min: parseFloat(min),
	    max: parseFloat(max),
	    slide: function(event, ui){
		var name = $(this).attr('id').split("_")[0]
		runtime.setControl(name, {value: map(ui.value, min, max, 0, 1) })
	    }
	});
    }

    // registra um novo modulo
    // e adiciona uma gui
    function addSlider(name, min, max){
	$wrapper = null;
	if(control_vars.indexOf(name) === -1){
	    control_vars.push(name)
	    runtime.addControl(name, {value: 0})
	    control_vars.push(name)
	    $wrapper = jquerySlider($('<div>'+name+'</div>').attr('id', name+"_slider").addClass("GUI"), min || 0, max || 1024)
	    $wrapper.appendTo("#control_container")
	    return {
		type: 'print',
		out: register_module("def "+name+"() if controls[\""+name+"\"] then v = controls[\""+name+"\"][\"value\"]; v else new Error name+' not available' #returns a value between "+min+" & "+max+" from '"+name+"' slider ")
	    }
	}
	else{
	    jquerySlider($('#'+name+'_slider'), min || 0, max || 1024)
	    return {
		type: 'print',
		out: name+' redefined' 
	    }
	}

	
    }

    // ---------------------------
    // FIM CONTROLES
    // ---------------------------

    
    // Comando de inicialização do wavepot
    var cmd_wavepot = function(enter, bufferSize, channels){
	if(enter){
            try{
		runtime = new window.WavepotRuntime(null, bufferSize, channels)
                runtime.init() 
		return "..................................\n. sintetizador de sample a sample. \n. amostragem: "+runtime.context.sampleRate+"              .\n. canais: "+runtime.channels+"                      .\n. buffer: "+runtime.bufferSize+"                   .\n.................................."
            }
            catch(e){
		return e.toString()
            }
	}
	else{
            runtime.stop();
            runtime = null;
            return "audio cleared"
	}
    }

    // Comandos diversos
    $.register_command(
    'wavepot',
    'start wavepot runtime for audio synthesis',
    'wavepot [no options] ou [tamanho do buffer, canais]\nApós inicializado tente help',
    {
        ps: 'wavepot',
            start_hook : function(args){ 
        var result = cmd_wavepot(true, args[1], args[2])
        return {
            type : 'print', 
            out : result 
        }; 
            },

            exit_hook : function(){ 
        return {
                    type : 'print',
                    out : cmd_wavepot(false)
        }; 
            },

            dispatch_method : function(args){
        if(args[0] === "help"){
            var msg = ""
	    if(args[1] === undefined){
		msg = "Páginas\n"+
		    "tutorial\t\tcomandos\n"+
		    "  (1) help tutorial\n"+
		    "  (2) help comandos\n"+
		    "  (3) help [comando]"
	    }
	    if(args[1] === "tutorial"){
		if(args[2] === undefined){
		    msg = "Tutoriais:\n"+
			"  help tutorial 0 - síntese por operações matemáticas\n"+
			"  help tutorial 1 - síntese com módulos pré-definidos\n"+
			"  help tutorial 2 - tocando e parando\n"+
			"  help tutorial 3 - gravando e fazendo download\n"+
			"  help tutorial 4 - tocando notas e ritmos\n"+
			"  help tutorial 5 - definindo novas funções"
		}
		if(args[2] === "0"){
		    msg = "Este ambiente aceita operações matemáticas para o DSP:"+
			" (1) Executando um ruído branco: \n"+
			"     wavepot> Math.random()*2 - 1\n\n"+
			"Existe variaveis chamadas 't' (tempo) e 'tau' (2PI) que podem ser usadas para controlar ondas periódicas:\n"+
			" (2) (TODO: não funcionando) Executando uma senoide com lá de orquestra:\n"+
			"     wavepot> Math.sin(tau*440*t)\n\n"+
			" (3) Silêncio\n"+
			"     wavepot> 0"
		    
		}
		if(args[2] === "1"){
		    msg = "Algumas operações matemáticas estão definidas em funções, onde cada uma representa um m[odulo-padrão em DSP:\n"+
			"Para ver cada uma utilize o comando 'inspect' ou 'inspect [módulo].\n"+
			"  (1) Senoide 440 Hz:\n"+
			"      wavepot> sin(440, 0.71)\n"+
			"      OU\n"+
			"      wavepot> sin 440, 0.71 [SEM PARÊNTESE]\n"+
			"  (2) Dente-de-serra 440 Hz\n"+
			"      wavepot> saw(440, 0.71)\n"+
			"      OU\n"+
			"      wavepot> saw 440, 0.71 [SEM PARÊNTESE]\n"+
			"  (3) Ruído-branco\n"+
			"      wavepot> noise(0.71)\n"+
			"      OU\n"+
			"      wavepot> noise 0.71 [SEM PARÊNTESE]\n"+
			"  (4) Silêncio\n"+
			"      wavepot> mute()"
		}
		if(args[2] === "2"){
		    msg = "Mesmo executando os procedimentos anteriores, não ouvimos nada.\n"+
			"Para tocar algum som, é necessário executar o comando 'play':\n"+
			"  (1) wavepot> sin 440, sin(110, 1)\n"+
			"      OU\n"+
			"      wavepot> sin 440, sin 110, .71 [SEM PARÊNTESE]\n"+
			"      wavepot> play\n\n"+
			"Outra opção é tocar antes de executar algum módulo\n"+
			"  (2) wavepot> play\n"+
			"      wavepot> sin 440, sin 110, 1"
		}
		if(args[2] === "3"){
		    msg = "Podemos gravar; assim como o comando play, ele pode ser chamado antes de qualquer outro.\n"+
			"  Deve ser usado em conjunto com 'export'; este disponibilizará um player embutido e um link para download(que pode ser realizado clicando com o botão direito do mouse em 'Download' e escolhendo a opção 'Salvar como'; por enquanto, no menu do 'Salvar como' Será necessário adicionar a extensão '.wav').\n"+
			"  (1) wavepot> sin(440, 1)\n"+
			"      wavepot> play\n"+
			"      wavepot> record\n"+
			"      wavepot> export\n"+
			"  (2) wavepot> play\n"+
			"      wavepot> sin(440, 1)\n"+
			"      wavepot> record\n"+
			"      wavepot> export\n"+
			"  (3) wavepot> play\n"+
			"      wavepot> record\n"+
			"      wavepot> sin(440, 1)\n"+
			"      wavepot> export\n"+
			"  (4) wavepot> record\n"+
			"      wavepot> play"+
			"      wavepot> sin(440, 1)\n"+
			"      wavepot> export\n"+
			"  (5) wavepot> record\n"+
			"      wavepot> sin(440, 1)\n"+
			"      wavepot> play\n"+
			"      wavepot> export\n"
		}
		if(args[2] === "4"){
		    msg = "Existe uma função chamada 'perc'; ela cria um loop de notas percutidas; \n"+
			"  (1) wavepot> inspect perc\n"+
			"      wavepot> perc(sin(440,1), 1, 2, 0.1, 0.9)\n"+
			"      OU\n"+
			"      wavepot> perc sin(440,1), 1, 2, 0.1, 0.9 [SEM PARÊNTESE NO perc]\n"+
			"      wavepot> play\n"+
			"\nExiste outra função chamada 'seq'; ela cria uma sequencia de notas; bom para ser usado junto com perc\n"+
			"  (2) wavepot> play\n"+
			"      wavepot> perc sin(seq([404,504]),1), 1, 0.5, 0.1, 0.3\n"+
			"  (3) Uma melodia com permutações\n"+
			"      wavepot> perc sin(seq([404,504,604]),sin(seq([204,304,404, 504]),1)), 1, 1, 0.1, 0.3"
		}

		if(args[2] === "5"){
		    msg = "definindo novas funções em tempo real é fácil:\n"+
			"  (1) definindo um som qualquer a partir de outro modulo e documentando-o\n"+
			"      wavepot> def minhafuncao() sin(440,1) #Retorna uma senoide de lá de orquestra\n"+
			"      wavepot> inspect minhafuncao\n"+
			"      wavepot> minhafuncao()\n"+
			"      wavepot> play"
		}
	    }
	    else if(args[1] === "comandos"){
		msg = "Comandos disponíveis\n"
		var a = ["play", "stop", "pause", "reset", "def", "inspect", "record", "export"];
		for(var c in a){
		    msg += (a[c]+" ")
		}    
            }
            else if(args[1] === "play"){
            msg = "Tocar.\nEste comando pode ser usado antes ou depois de definir um módulo de áudio\n"+
                "---------------\n"+
                "retorna BOOLEAN"
            }
            else if(args[1] === "stop"){
            msg = "Parar o processamento de audio.\n"+
                "---------------\n"+
                "retorna BOOLEAN"
            }
            else if(args[1] === "pause"){
            msg = "Pausa processamento o audio\n"+
                "---------------\n"+
                "retorna BOOLEAN"
            }
            else if(args[1] === "reset"){
             msg = "Reinicia o processamento\n"+
                "---------------\n"+
                "retorna FLOAT"
            }
            else if(args[1] === "record"){
             msg = "Grava o processamento de áudio\n"+
                "---------------\n"+
                "retorna BOOLEAN"
            }
            else if(args[1] === "export"){
             msg = "Exporta o que foi gravado para um player embutido\n"+
                "e fica disponível para download\n"+
                "---------------\n"+
                "retorna BOOLEAN"
            }
            else if(args[1] === "def"){
		msg = "O comando def define uma nova função"+
		    "  def [função e argumentos] [operação]\n"+
		    "      (1) Define um número randômico inteiro \n"+
		    "          wavepot> def funcao(maximo) Math.floor(Math.random()*maximo)\n"+
		    "          wavepot> inspect funcao\n"+
		    "            var funcao = function(maximo){\n"+
		    "              return Math.floor(Math.random()*maximo)\n"+
		    "            }\n"+
                    "      (2) Define um som padrao\n"+
		    "          wavepot> def padrao() sin(440,1)\n"+
		    "          wavepot> inspect padrao\n"+
		    "            var padrao = function(){\n"+
		    "              return sin(440,1)\n"+
		    "            }\n"+
		    "        retorna uma soma do argumento mais 1\n"+
		    "      (3) Define uma síntese AM simples\n"+
		    "          wavepot> def am(portadora, moduladora) sin(portadora,1) * sin(moduladora, 1)\n"+
		    "          OU\n"+
		    "          wavepot> def am(portadora, moduladora) sin(portadora, sin(moduladora, 1))\n"+
		    "          VARIANDO AM\n"+
		    "          wavepot> def am(portadora, moduladora, index) sin(portadora, sin(moduladora, index))"
            }
            else if(args[1] === "inspect"){
             msg = "Inspeciona os módulos disponíveis\n"+
                "Se for dado um argumento, procurará se este existe;\n em caso positivo mostra o código fonte\n"+
                "  exemplo:\n"+
                "    (1) inspect\n"+
                "    (2) inspect noise\n"
		"    (3) inspect sin"
            }
            
            return {type: 'print', out: msg}
            
        }
        if(args[0] === "play"){
            runtime.play()
            return {
            type: 'print',
            out: runtime.playing
            }
        }
        if(args[0] === "stop"){
            runtime.stop()
            return {
            type:'print', 
            out: !runtime.playing
            }
        }
        if(args[0] === "mute"){
            return {
            type:'print', 
            callback: 'mute',
            out: "muted"
            }
        }
        if(args[0] === "pause"){
            runtime.pause()
            return {
            type:'print', 
            out: !runtime.playing
            }
        }
        if(args[0] === "reset"){
            var previous_time = runtime.time;
            runtime.reset()
            return {
            type:'print', 
            out: previous_time+"->"+runtime.time
            }
        }
        if(args[0] === "record"){
            runtime.record(true);
            return {
		type:'print', 
		out: runtime.recording
            }
        }
        if(args[0] === "export"){
	    runtime.exportWAV(function(blob){
		console.log(blob);
		runtime.stop()
		runtime.clear()
		var url = window.URL.createObjectURL(blob)
		
		var $typebox = $("<div>Sua gravação, você pode fazer o <a href="+url+">Download aqui</a></div>").appendTo('.cmd_terminal_content');
		var $br = $('<br/>').appendTo($typebox);
		var $audio = $("<audio controls><source src="+url+"></source></audio>").appendTo($typebox);
            });
            return {
		type:'print', 
		out: runtime.recording
            }
        }
        if(args[0] === "def"){
            var fn = null;
            var _args = null;
            var name = null;
	    
	    args = args.join(" ")
	    name = register_module(args)
	    return {
		type: 'print',
		out: name+" defined" 
	    }
	}       
        if(args[0] === "inspect"){
            var msg = "funções definidas\n"
            var i = 0;
            if(args[1] === undefined){
		for(var v in environment){
                    msg += v+"\t";
                    if(i%7===0) msg+="\n"
                    i++;
		}
            }
            else{
            msg = environment[args[1]]
            }
            return {type:'print', out: msg}
        }
//        if(args[0] === "exe"){
        // Se algum comando for diferente
	// dos anteriores, interpretar como
	// Uma execução de um módulo de áudio
	// (ver inspect)
	else{
	    cs = args.join(" ")

	    //Memorizar o código corrente
	    //Para poder utilizar como módulo
	    //definido pelo usuário
	    //assim n precisa ficar escrevendo
	    //um monte de função
	    current = args[0].split(" ")[0]

	    // Esta é a função que vai ser o ambiente 'environment'
	    // concatenado em uma única string
	    // TODO minificar com ugly.js?
	    envir=""
	    for(var v in environment){
		envir += (environment[v]+"\n");
	    }

	    //Compile a string cs para js sem escopo
	    js = CoffeeScript.compile(cs, {bare: true})
            
	    //Verifique se o comando dado foi um controle ou audio
	    var reg = /slider(\(|\s)(\'|\")[a-z]+(\'|\")\,\s?\d\s?\,\s?\d(\)|\s)?/
	    if(reg.test(cs)){
		var reg1 = /slider\((\'|\")[a-z]+(\'|\")\,\s?\d\s?\,\s?\d\)?/
		var reg2 = /slider\s(\'|\")[a-z]+(\'|\")\,\s?\d\s?\,\s?\d\s?/
		var nome = null
		var min = null
		if(reg1.test(cs)){
		    s =  cs.split(",")
		    s1 = s[0].split("(")
		    nome = s1[1].split("\"")[1].split("\"")[0]
		    min = s[1]
		    max = s[2].split(")")[0]
		}
		// TODO arrumar coffeescript
		return addSlider(nome, min, max)
	    }
	    else{
		envir += "var dsp = function(t){\n\treturn "+js+"\n};";
            
		// Descomente se quiser ver tudo: debug
		//window.console.log(envir);
		return {
		    type: 'print',
		    out: runtime.compile(envir)
		}
	    }

        }   
      }
    }
  )   
})
    
