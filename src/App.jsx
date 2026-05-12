import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './App.css';

function App() {
  // 🔥 CONTROLE DE TELAS: 'landing' (Vendas), 'login' (Acesso), 'dashboard' (Logado)
  const [telaAtiva, setTelaAtiva] = useState('landing');

  // SEGURANÇA E SESSÃO
  const [usuarioLogado, setUsuarioLogado] = useState(() => {
    const salvo = localStorage.getItem('usuarioLogado');
    return salvo ? JSON.parse(salvo) : null;
  });
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('sessionToken') || '');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  
  const [novoUserEmail, setNovoUserEmail] = useState('');
  const [novoUserSenha, setNovoUserSenha] = useState('');

  const [estrategias, setEstrategias] = useState([]);
  const [rankingTimes, setRankingTimes] = useState([]);
  const [estatisticasComp, setEstatisticasComp] = useState([]);
  const [matrizJogos, setMatrizJogos] = useState([]);
  const [sinaisAtivos, setSinaisAtivos] = useState([]);
  const [dicasIA, setDicasIA] = useState([]);
  
  const [alertasMaximas, setAlertasMaximas] = useState([]);
  const [alertasNotificados, setAlertasNotificados] = useState([]); 
  
  const [listaClientes, setListaClientes] = useState([]);
  
  const [nome, setNome] = useState('');
  const [sequencia, setSequencia] = useState([]);
  const [inputValor, setInputValor] = useState('');

  const [ligaSelecionada, setLigaSelecionada] = useState('Copa');
  const [placarFiltro, setPlacarFiltro] = useState(null); 
  const [mercadoAtivo, setMercadoAtivo] = useState('AMBAS');
  
  const [mostrarOdds, setMostrarOdds] = useState(true);
  const [mostrarRankingMobile, setMostrarRankingMobile] = useState(false);
  const [mostrarMaximasMobile, setMostrarMaximasMobile] = useState(true);
  const [abaAtual, setAbaAtual] = useState(null); 

  const ligasDisponiveis = ['Copa', 'Euro', 'Sul-Americana', 'Premier'];
  const [erroDB, setErroDB] = useState('');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('');

  const [backtestInput, setBacktestInput] = useState('');
  const [backtestLiga, setBacktestLiga] = useState('Todas');
  const [resultadoBacktest, setResultadoBacktest] = useState(null);
  const [carregandoBacktest, setCarregandoBacktest] = useState(false);

  const mercadosDrop = [
    { id: 'AMBAS', label: 'Ambas Marcam (Sim)' },
    { id: 'AMBAS_NAO', label: 'Ambas Não Marcam' },
    { id: 'OVER_15', label: '+1.5 Gols' },
    { id: 'OVER_25', label: '+2.5 Gols' },
    { id: 'OVER_45', label: '+5 Gols na Partida (FT)' },
    { id: 'GOLEADA', label: '+5 Gols de um Time' },
  ];

  const efetuarLogin = async (e) => {
    e.preventDefault();
    setErroLogin('');
    
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', loginEmail)
      .eq('senha', loginSenha)
      .single();

    if (error || !data) {
      setErroLogin('Usuário ou senha incorretos!');
      return;
    }

    const newToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    await supabase.from('usuarios').update({ session_token: newToken }).eq('id', data.id);

    localStorage.setItem('usuarioLogado', JSON.stringify(data));
    localStorage.setItem('sessionToken', newToken);

    setSessionToken(newToken);
    setUsuarioLogado(data);
  };

  const fazerLogout = () => {
    setUsuarioLogado(null);
    setSessionToken('');
    localStorage.removeItem('usuarioLogado');
    localStorage.removeItem('sessionToken');
    setLoginEmail(''); 
    setLoginSenha(''); 
    setAbaAtual(null);
    setTelaAtiva('landing'); // Volta pra home ao sair
  };

  const cadastrarCliente = async () => {
    if (!novoUserEmail || !novoUserSenha) return alert("Preencha email e senha!");
    const { error } = await supabase.from('usuarios').insert([{ email: novoUserEmail, senha: novoUserSenha, role: 'user', acesso_backtest: false, acesso_ia: false }]);
    if (error) alert("❌ Erro: " + error.message);
    else { alert("✅ Cliente cadastrado com sucesso!"); setNovoUserEmail(''); setNovoUserSenha(''); buscarDados(); }
  };

  const togglePermissao = async (id, campo, valorAtual) => {
    const { error } = await supabase.from('usuarios').update({ [campo]: !valorAtual }).eq('id', id);
    if (error) alert("Erro ao atualizar permissão: " + error.message);
    else buscarDados(); 
  };

  const sortHoursDescending = (horasArray) => {
    return horasArray.sort((a, b) => {
      let diff = b - a;
      if (diff > 12) return -1;  
      if (diff < -12) return 1;  
      return diff;               
    });
  };

  useEffect(() => {
    if (!usuarioLogado) return;

    const validarSessaoEBuscarDados = async () => {
      if (usuarioLogado.role === 'admin') {
        buscarDados();
        return;
      }

      const { data: userDB } = await supabase
        .from('usuarios')
        .select('session_token')
        .eq('id', usuarioLogado.id)
        .single();

      if (userDB && userDB.session_token !== sessionToken) {
        alert("⚠️ ATENÇÃO: Sua conta foi conectada em outro dispositivo. Você foi desconectado.");
        fazerLogout();
        return; 
      }

      buscarDados();
    };

    validarSessaoEBuscarDados(); 
    const intervalId = setInterval(() => { validarSessaoEBuscarDados(); }, 10000); 
    return () => clearInterval(intervalId);
  }, [usuarioLogado, sessionToken]);

  useEffect(() => {
    if (matrizJogos.length > 0) calcularEstatisticasGlobais(matrizJogos);
  }, [matrizJogos, ligaSelecionada, estrategias, mercadoAtivo]);

  useEffect(() => {
    if (alertasMaximas.length > 0) {
      const ligasAtuais = alertasMaximas.map(a => a.liga);
      const ligasNovasParaApitar = ligasAtuais.filter(liga => !alertasNotificados.includes(liga));

      if (ligasNovasParaApitar.length > 0) {
        const somDeAlerta = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        somDeAlerta.play().catch(err => console.log("O navegador bloqueou o áudio temporariamente.", err));
        setAlertasNotificados(prev => [...prev, ...ligasNovasParaApitar]);
      }
      setAlertasNotificados(prev => prev.filter(liga => ligasAtuais.includes(liga)));
    } else {
      setAlertasNotificados([]);
    }
  }, [alertasMaximas]);

  async function buscarDados() {
    setErroDB('');
    const { data: est } = await supabase.from('estrategias').select('*').order('created_at', { ascending: false });
    if (est) setEstrategias([...est]);

    const { data: iaData } = await supabase.from('dicas_ia').select('*').order('assertividade', { ascending: false });
    if (iaData) setDicasIA([...iaData]);

    if (usuarioLogado?.role === 'admin') {
      const { data: users } = await supabase.from('usuarios').select('*').eq('role', 'user').order('created_at', { ascending: false });
      if (users) setListaClientes(users);
    }

    const { data: matriz, error: erroMat } = await supabase.from('matriz_resultados').select('*').limit(500);
    if (erroMat) setErroDB("Erro matriz: " + erroMat.message);
    else if (matriz) { setMatrizJogos([...matriz]); setUltimaAtualizacao(new Date().toLocaleTimeString()); }
  }

  const normalizar = (texto) => String(texto).trim().toLowerCase();

  const checarPlacar = (placar, condicao) => {
    if (!placar) return false;
    const p = String(placar).trim();
    if (p === "-" || p === "?") return false;
    if (!p.includes("-")) return false; 

    const [cStr, fStr] = p.split("-");
    if (cStr === undefined || fStr === undefined || cStr.trim() === "" || fStr.trim() === "") return false;

    const c = Number(cStr);
    const f = Number(fStr);
    if (isNaN(c) || isNaN(f)) return false;
    
    const total = c + f;
    const cond = String(condicao).replace(/\s/g, '').toUpperCase();

    if (cond === "+3.5" || cond === "OVER3.5" || cond === "3.5") return total >= 4;
    if (cond === "-3.5" || cond === "UNDER3.5") return total <= 3;
    if (cond === "+2.5" || cond === "OVER2.5" || cond === "2.5") return total >= 3;
    if (cond === "-2.5" || cond === "UNDER2.5") return total <= 2;
    if (cond === "+1.5" || cond === "OVER1.5" || cond === "1.5") return total >= 2;
    if (cond === "-1.5" || cond === "UNDER1.5") return total <= 1;
    if (cond === "+0.5" || cond === "OVER0.5" || cond === "0.5") return total >= 1;
    if (cond === "-0.5" || cond === "UNDER0.5") return total === 0;
    if (cond === "AMBAS" || cond === "BTTS") return c > 0 && f > 0;
    return p === cond;
  };

  const calcularCorDinamica = (placar, mercado) => {
    if (!placar) return "empty-cell";
    const p = String(placar).trim();
    if (p === "-" || p === "?") return "empty-cell";
    if (!p.includes("-")) return "empty-cell"; 
    
    const [cStr, fStr] = p.split("-");
    if (cStr === undefined || fStr === undefined || cStr.trim() === "" || fStr.trim() === "") return "empty-cell";

    const c = Number(cStr);
    const f = Number(fStr);
    if (isNaN(c) || isNaN(f)) return "empty-cell";
    
    const total = c + f;
    let isGreen = false;
    switch (mercado) {
      case 'AMBAS': isGreen = (c > 0 && f > 0); break;
      case 'AMBAS_NAO': isGreen = (c === 0 || f === 0); break;
      case 'OVER_15': isGreen = (total >= 2); break;
      case 'OVER_25': isGreen = (total >= 3); break;
      case 'OVER_45': isGreen = (total >= 5); break;
      case 'GOLEADA': isGreen = (c >= 5 || f >= 5); break;
      default: isGreen = (c > 0 && f > 0);
    }
    return isGreen ? 'bg-green' : 'bg-red';
  };

  const calcularEstatisticasGlobais = (dadosMatriz) => {
    const timesStats = {};
    const maximasPorLiga = [];
    let alertasMax = []; 
    const ligasUnicas = [...new Set(dadosMatriz.map(m => m.liga))];

    const dadosFiltradosParaRanking = dadosMatriz.filter(m => normalizar(m.liga) === normalizar(ligaSelecionada));
    dadosFiltradosParaRanking.forEach(linha => {
      if (linha.resultados) {
        Object.values(linha.resultados).forEach(jogo => {
          if (calcularCorDinamica(jogo.placar, mercadoAtivo) !== "empty-cell") {
            const [c, f] = String(jogo.placar).split("-").map(Number);
            if (!timesStats[jogo.home]) timesStats[jogo.home] = { jogos: 0, hits: 0 };
            if (!timesStats[jogo.away]) timesStats[jogo.away] = { jogos: 0, hits: 0 };
            timesStats[jogo.home].jogos += 1;
            timesStats[jogo.away].jogos += 1;
            if (calcularCorDinamica(jogo.placar, mercadoAtivo) === 'bg-green') {
              timesStats[jogo.home].hits += 1;
              timesStats[jogo.away].hits += 1;
            }
          }
        });
      }
    });

    const rankingArray = Object.keys(timesStats).map(time => {
      const stats = timesStats[time];
      return { time, porcentagem: stats.jogos > 0 ? Math.round((stats.hits / stats.jogos) * 100) : 0 };
    });
    rankingArray.sort((a, b) => b.porcentagem - a.porcentagem);
    setRankingTimes(rankingArray.slice(0, 10));

    let alertasGerados = [];
    ligasUnicas.forEach(ligaNome => {
      const linhasDessaLiga = dadosMatriz.filter(m => m.liga === ligaNome);
      
      const horasUnicas = [...new Set(linhasDessaLiga.map(j => Number(j.hora)))];
      const horasDesc = sortHoursDescending(horasUnicas);
      const hourAge = {};
      horasDesc.forEach((h, idx) => hourAge[h] = idx);

      let flatJogos = [];
      horasDesc.forEach(h => {
        const linha = linhasDessaLiga.find(m => Number(m.hora) === h);
        if (linha && linha.resultados) {
          Object.keys(linha.resultados).forEach(min => {
            const jogo = linha.resultados[min];
            flatJogos.push({ hora: Number(linha.hora), min: Number(min), placar: jogo.placar, corDinamica: calcularCorDinamica(jogo.placar, mercadoAtivo) });
          });
        }
      });

      flatJogos.sort((a, b) => {
        if (hourAge[a.hora] !== hourAge[b.hora]) return hourAge[a.hora] - hourAge[b.hora]; 
        return a.min - b.min; 
      });

      estrategias.forEach(est => {
        let padraoArray = [];
        try { padraoArray = typeof est.padrao_visual === 'string' ? JSON.parse(est.padrao_visual) : est.padrao_visual; } catch(e) { return; }
        if (!padraoArray || padraoArray.length === 0 || !est.ativa) return;
        const padrao = padraoArray.map(p => p.valor);
        const tamanho = padrao.length;

        if (flatJogos.length >= tamanho) {
          for (let i = 0; i <= flatJogos.length - tamanho; i++) {
            let janela = flatJogos.slice(i, i + tamanho);
            if (janela.some(j => calcularCorDinamica(j.placar, mercadoAtivo) === "empty-cell")) continue;

            let match = true;
            let minsGatilho = [];
            for (let j = 0; j < tamanho; j++) {
              if (!checarPlacar(janela[j].placar, padrao[j])) { match = false; break; }
              minsGatilho.push(janela[j].min);
            }
            
            if (match) {
              let horaUltimoJogo = janela[tamanho - 1].hora;
              let horaAlvo = horaUltimoJogo + 1; 
              if (horaAlvo >= 24) horaAlvo -= 24;
              
              alertasGerados.push({ liga: ligaNome, horaAlvo: horaAlvo, minutosAlvo: minsGatilho });
            }
          }
        }
      });

      let maxStreak = 0; let currentStreak = 0;
      flatJogos.filter(j => j.corDinamica !== "empty-cell").forEach(jogo => {
        if (jogo.corDinamica === 'bg-red') { 
            currentStreak++; 
            if (currentStreak > maxStreak) maxStreak = currentStreak; 
        } else if (jogo.corDinamica === 'bg-green') {
            currentStreak = 0;
        }
      });
      maximasPorLiga.push({ liga: ligaNome, jogos_sem_ambas: maxStreak, jejum_atual: currentStreak });

      if (currentStreak === maxStreak && currentStreak >= 4) {
        alertasMax.push({ liga: ligaNome, streak: currentStreak });
      }
    });

    const sinaisUnicos = alertasGerados.filter((v, i, a) => a.findIndex(t => (t.liga === v.liga && t.horaAlvo === v.horaAlvo && JSON.stringify(t.minutosAlvo) === JSON.stringify(v.minutosAlvo))) === i);

    setSinaisAtivos(sinaisUnicos);
    setEstatisticasComp(maximasPorLiga);
    setAlertasMaximas(alertasMax); 
  };

  const executarBacktest = async () => {
    if (!backtestInput) return alert("Digite a sequência que deseja testar! Ex: +2.5, 0-1");
    setCarregandoBacktest(true);
    setResultadoBacktest(null);

    const padraoArray = backtestInput.split(',').map(v => v.trim().toUpperCase()).filter(v => v !== "");
    const tamanho = padraoArray.length;

    try {
      let query = supabase.from('historico_absoluto').select('*').order('data_jogo').order('hora').order('minuto');
      if (backtestLiga !== 'Todas') {
        query = query.eq('liga', backtestLiga);
      }
      
      const { data: historico, error } = await query;
      
      if (error) throw error;
      if (!historico || historico.length === 0) {
        setResultadoBacktest({ erro: "Histórico vazio. O alimentador IA precisa rodar mais vezes." });
        setCarregandoBacktest(false);
        return;
      }

      const ligasJogos = {};
      historico.forEach(j => {
        if(!ligasJogos[j.liga]) ligasJogos[j.liga] = [];
        ligasJogos[j.liga].push(j);
      });

      let tentativas = 0;
      let greens = 0;

      Object.values(ligasJogos).forEach(listaJogos => {
        for (let i = 0; i <= listaJogos.length - tamanho - 1; i++) {
          let janela = listaJogos.slice(i, i + tamanho);
          
          let match = true;
          for (let j = 0; j < tamanho; j++) {
            if (!checarPlacar(janela[j].placar, padraoArray[j])) {
              match = false;
              break;
            }
          }

          if (match) {
            tentativas++;
            let greenBateu = false;
            
            for (let step = 0; step < 3; step++) {
              let apostaIdx = i + tamanho + step;
              if (apostaIdx < listaJogos.length) {
                let jogoAposta = listaJogos[apostaIdx];
                if (jogoAposta.placar !== "-" && calcularCorDinamica(jogoAposta.placar, mercadoAtivo) === 'bg-green') {
                  greenBateu = true;
                  break; 
                }
              }
            }

            if (greenBateu) {
              greens++;
            }
          }
        }
      });

      const assertividade = tentativas > 0 ? ((greens / tentativas) * 100).toFixed(1) : 0;

      setResultadoBacktest({
        tentativas,
        greens,
        assertividade,
        mercadoNome: mercadosDrop.find(m => m.id === mercadoAtivo)?.label
      });

    } catch (err) {
      alert("Erro ao fazer backtest: " + err.message);
    }
    setCarregandoBacktest(false);
  };

  const adicionarBloco = () => {
    if (!inputValor) return;
    const novosBlocos = inputValor.split(',').map(v => v.trim().toUpperCase()).filter(v => v !== "").map(v => ({ id: Date.now() + Math.random(), valor: v }));
    setSequencia([...sequencia, ...novosBlocos]);
    setInputValor('');
  };

  const salvarDados = async () => {
    if (!nome || sequencia.length === 0) return alert("Preencha o nome e a sequência!");
    const { error } = await supabase.from('estrategias').insert([{ nome, padrao_visual: sequencia, ativa: true }]);
    if (error) alert("❌ Erro ao salvar: " + error.message);
    else { setNome(''); setSequencia([]); buscarDados(); setAbaAtual(null); window.scrollTo(0, 0); }
  };

  const copiarDicaIA = (dica) => {
    setNome(`🎯 Auto I.A: ${dica.liga}`);
    setSequencia(dica.padrao);
    setAbaAtual('GATILHOS'); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  // ==========================================
  // 🔥 RENDERIZAÇÃO DA PÁGINA DE VENDAS (LANDING)
  // ==========================================
  if (!usuarioLogado && telaAtiva === 'landing') {
    return (
      <div style={{ backgroundColor: '#0a0a0a', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', borderBottom: '1px solid #222' }}>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#fff' }}>TH JURUNAS <span style={{ color: '#9FC131' }}>SYSTEM</span></h2>
          <button onClick={() => setTelaAtiva('login')} style={{ background: 'transparent', border: '1px solid #9FC131', color: '#9FC131', padding: '8px 20px', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' }}>
            JÁ SOU VIP (ENTRAR)
          </button>
        </header>

        {/* HERO SECTION */}
        <section style={{ textAlign: 'center', padding: '80px 20px', maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '42px', marginBottom: '20px', lineHeight: '1.2' }}>Aumente sua Assertividade no <span style={{ color: '#00f2fe' }}>Futebol Virtual</span></h1>
          <p style={{ fontSize: '18px', color: '#aaa', marginBottom: '40px', lineHeight: '1.6' }}>
            O único Radar Esportivo equipado com Inteligência Artificial que identifica Padrões Ouro e valida entradas ao vivo com Backtest em tempo real. Pare de depender da sorte.
          </p>
          <a href="#planos" style={{ display: 'inline-block', textDecoration: 'none', background: '#9FC131', color: '#000', padding: '15px 40px', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', boxShadow: '0 0 20px rgba(159, 193, 49, 0.4)' }}>
            QUERO ACESSO AO RADAR
          </a>
        </section>

        {/* FEATURES */}
        <section style={{ background: '#111', padding: '60px 20px' }}>
          <h2 style={{ textAlign: 'center', fontSize: '28px', marginBottom: '40px' }}>Por que escolher o nosso sistema?</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center', maxWidth: '1000px', margin: '0 auto' }}>
            
            <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '10px', flex: '1 1 250px', borderTop: '3px solid #9FC131' }}>
              <h3 style={{ color: '#9FC131', marginTop: 0 }}>📡 Radar Ao Vivo</h3>
              <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>Acompanhe as Ligas Copa, Euro, Sul-Americana e Premier com cores e alertas visuais (Neon) em tempo real, sem delay.</p>
            </div>

            <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '10px', flex: '1 1 250px', borderTop: '3px solid #00f2fe' }}>
              <h3 style={{ color: '#00f2fe', marginTop: 0 }}>🤖 Inteligência Artificial</h3>
              <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>Nosso robô lê milhares de jogos diários e te entrega os "Padrões Ouro" mastigados, com a % exata de Win Rate para você lucrar.</p>
            </div>

            <div style={{ background: '#1a1a1a', padding: '30px', borderRadius: '10px', flex: '1 1 250px', borderTop: '3px solid #ffcc00' }}>
              <h3 style={{ color: '#ffcc00', marginTop: 0 }}>🧪 Backtest Rápido</h3>
              <p style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5' }}>Não teste na sua banca. Digite o padrão no Laboratório e o sistema calcula instantaneamente se aquela estratégia é lucrativa ou não.</p>
            </div>

          </div>
        </section>

        {/* PLANOS & PREÇOS */}
        <section id="planos" style={{ padding: '80px 20px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', marginBottom: '10px' }}>Escolha seu Plano VIP</h2>
          <p style={{ color: '#aaa', marginBottom: '50px' }}>Acesso total ao Radar, Inteligência Artificial e Backtest.</p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px', justifyContent: 'center', maxWidth: '800px', margin: '0 auto' }}>
            
            <div style={{ background: '#111', border: '1px solid #333', padding: '40px', borderRadius: '15px', flex: '1 1 300px' }}>
              <h3 style={{ fontSize: '24px', margin: '0 0 10px 0', color: '#fff' }}>MENSAL</h3>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#9FC131', marginBottom: '20px' }}>R$ 30<span style={{ fontSize: '16px', color: '#888' }}>/mês</span></div>
              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', color: '#ccc', marginBottom: '30px', lineHeight: '2' }}>
                <li>✅ Acesso ao Radar 24/7</li>
                <li>✅ Ligas: Copa, Euro, Sul e Premier</li>
                <li>✅ Alertas de Máximas (Red)</li>
                <li>❌ Inteligência Artificial Ouro</li>
              </ul>
              {/* TROQUE O LINK DO WHATSAPP AQUI */}
              <a href="https://wa.me/5585999999999?text=Olá, quero assinar o Plano Mensal do Radar!" target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', background: 'transparent', color: '#9FC131', border: '2px solid #9FC131', padding: '12px', fontWeight: 'bold', borderRadius: '8px' }}>
                ASSINAR MENSAL
              </a>
            </div>

            <div style={{ background: '#1a1a1a', border: '2px solid #00f2fe', padding: '40px', borderRadius: '15px', flex: '1 1 300px', transform: 'scale(1.05)', boxShadow: '0 0 30px rgba(0, 242, 254, 0.15)' }}>
              <div style={{ background: '#00f2fe', color: '#000', fontSize: '12px', fontWeight: 'bold', padding: '5px 10px', borderRadius: '20px', display: 'inline-block', marginBottom: '15px' }}>MAIS VENDIDO</div>
              <h3 style={{ fontSize: '24px', margin: '0 0 10px 0', color: '#fff' }}>VIP PRO</h3>
              <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#00f2fe', marginBottom: '20px' }}>R$ 50<span style={{ fontSize: '16px', color: '#888' }}>/mês</span></div>
              <ul style={{ listStyle: 'none', padding: 0, textAlign: 'left', color: '#ccc', marginBottom: '30px', lineHeight: '2' }}>
                <li>✅ Acesso ao Radar 24/7</li>
                <li>✅ Laboratório de Backtest Liberado</li>
                <li>✅ Dicas da Inteligência Artificial</li>
                <li>✅ Suporte Prioritário</li>
              </ul>
              {/* TROQUE O LINK DO WHATSAPP AQUI */}
              <a href="https://wa.me/5585999999999?text=Olá, quero assinar o Plano VIP PRO do Radar!" target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', background: '#00f2fe', color: '#000', padding: '12px', fontWeight: 'bold', borderRadius: '8px' }}>
                ASSINAR VIP PRO
              </a>
            </div>

          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ textAlign: 'center', padding: '40px', background: '#050505', borderTop: '1px solid #111', color: '#666', fontSize: '12px' }}>
          <p>© {new Date().getFullYear()} TH JURUNAS SYSTEM. Todos os direitos reservados.</p>
          <button onClick={() => setTelaAtiva('login')} style={{ background: 'transparent', border: 'none', color: '#9FC131', cursor: 'pointer', textDecoration: 'underline' }}>Já tem uma conta? Faça Login.</button>
        </footer>
      </div>
    );
  }

  // ==========================================
  // 🔥 TELA DE LOGIN 
  // ==========================================
  if (!usuarioLogado && telaAtiva === 'login') {
    return (
      <div className="login-container">
        <div className="login-box">
          {/* Botão de Voltar para Vendas */}
          <button onClick={() => setTelaAtiva('landing')} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', marginBottom: '20px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ← Voltar para o Início
          </button>

          <h2 className="main-logo" style={{textAlign: 'center', marginBottom: '30px'}}>TH JURUNAS <span>SYSTEM</span></h2>
          <form onSubmit={efetuarLogin}>
            <label>USUÁRIO</label>
            <input className="flet-input" type="text" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
            <label className="mt-20">SENHA</label>
            <input className="flet-input" type="password" value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)} required />
            {erroLogin && <div style={{color: '#ff4444', marginTop: '10px', fontSize: '13px', textAlign: 'center'}}>{erroLogin}</div>}
            <button className="btn-flet-save" style={{marginTop: '25px', width: '100%'}} type="submit">ENTRAR NO SISTEMA</button>
          </form>
        </div>
      </div>
    );
  }

  // ==========================================
  // 🔥 O SISTEMA (DASHBOARD) SÓ RODA DAQUI PRA BAIXO SE ESTIVER LOGADO
  // ==========================================

  const isAdmin = usuarioLogado.role === 'admin';
  const canViewBacktest = isAdmin || usuarioLogado.acesso_backtest;
  const canViewIA = isAdmin || usuarioLogado.acesso_ia;
  const canViewGatilhos = isAdmin;
  const canViewClientes = isAdmin;
  
  const showMenuTop = canViewBacktest || canViewIA || canViewGatilhos || canViewClientes;

  const linhasDaLiga = matrizJogos.filter(m => normalizar(m.liga) === normalizar(ligaSelecionada));
  
  let hrsSet = new Set(linhasDaLiga.map(m => Number(m.hora)));
  sinaisAtivos.filter(s => s.liga === ligaSelecionada).forEach(s => hrsSet.add(s.horaAlvo));
  
  const horasDinamicasArray = sortHoursDescending([...hrsSet]);
  const horasParaMostrar = horasDinamicasArray.length > 0 ? horasDinamicasArray.slice(0, 12) : [];
  
  let minutosDinamicos = [];
  linhasDaLiga.forEach(linha => {
    if (linha.resultados) {
      Object.keys(linha.resultados).forEach(min => {
        const numMin = Number(min);
        if (!minutosDinamicos.includes(numMin) && !isNaN(numMin)) minutosDinamicos.push(numMin);
      });
    }
  });
  minutosDinamicos.sort((a, b) => a - b);
  const minutosCols = minutosDinamicos.length > 0 ? minutosDinamicos : [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37, 40, 43, 46, 49, 52, 55, 58];

  const horasDescLocal = sortHoursDescending([...new Set(linhasDaLiga.map(m => Number(m.hora)))]);
  const hourAgeLocal = {}; horasDescLocal.forEach((h, idx) => hourAgeLocal[h] = idx);
  
  let celulasMaxima = []; let streakAtual = [];
  let todosJogosRadar = [];
  horasDescLocal.forEach(h => {
    const linha = linhasDaLiga.find(m => Number(m.hora) === h);
    if(linha && linha.resultados) {
      Object.keys(linha.resultados).forEach(min => {
        const jogo = linha.resultados[min];
        if (calcularCorDinamica(jogo.placar, mercadoAtivo) !== "empty-cell") {
           todosJogosRadar.push({ hora: Number(linha.hora), min: Number(min), corDinamica: calcularCorDinamica(jogo.placar, mercadoAtivo) });
        }
      });
    }
  });

  todosJogosRadar.sort((a, b) => {
    if (hourAgeLocal[a.hora] !== hourAgeLocal[b.hora]) return hourAgeLocal[b.hora] - hourAgeLocal[a.hora];
    return a.min - b.min;
  });

  todosJogosRadar.forEach(jogo => {
    if (jogo.corDinamica === 'bg-red') { streakAtual.push(`${jogo.hora}-${jogo.min}`); if (streakAtual.length > celulasMaxima.length) celulasMaxima = [...streakAtual]; } 
    else if (jogo.corDinamica === 'bg-green') streakAtual = [];
  });
  const setMaximas = new Set(celulasMaxima);

  const statsPorMinuto = {};
  minutosCols.forEach(min => {
    let totalValidos = 0; let totalGreens = 0;
    horasDescLocal.forEach(h => {
      const linha = linhasDaLiga.find(m => Number(m.hora) === h);
      if (linha && linha.resultados && linha.resultados[String(min)]) {
        const jogo = linha.resultados[String(min)];
        if (calcularCorDinamica(jogo.placar, mercadoAtivo) !== "empty-cell") {
             totalValidos++;
             if (calcularCorDinamica(jogo.placar, mercadoAtivo) === 'bg-green') totalGreens++;
        }
      }
    });
    statsPorMinuto[min] = { greens: totalGreens, perc: totalValidos > 0 ? Math.round((totalGreens / totalValidos) * 100) : 0 };
  });

  const renderCell = (hora, min) => {
    const chave = `${hora}-${min}`;
    const isTarget = sinaisAtivos.some(s => s.liga === ligaSelecionada && s.horaAlvo === Number(hora) && s.minutosAlvo.includes(Number(min)));

    let classesExtras = "";
    if (isTarget) classesExtras += " target-cell";

    if (matrizJogos.length > 0) {
      const linha = linhasDaLiga.find(m => Number(m.hora) === Number(hora));
      if (linha && linha.resultados && linha.resultados[String(min)]) {
        const res = linha.resultados[String(min)];
        const isMaxima = setMaximas.has(chave);
        const isSelected = placarFiltro === res.placar;
        const corDefinitiva = calcularCorDinamica(res.placar, mercadoAtivo);

        if (isMaxima) classesExtras += " blink-maxima";
        if (isSelected) classesExtras += " selected-score";
        
        const rawPlacar = String(res.placar || "").trim();
        const hasHyphen = rawPlacar.includes("-");
        const isPlacarVazio = rawPlacar === "-" || rawPlacar === "?" || rawPlacar === "";
        
        const oddSimDB = res.odd_sim && String(res.odd_sim).trim() !== "None" && String(res.odd_sim).trim() !== "-" && String(res.odd_sim).trim() !== "?" ? res.odd_sim : null;
        const isOddInjetada = !hasHyphen && !isPlacarVazio && /\d/.test(rawPlacar);
        
        const oddParaMostrar = isOddInjetada ? rawPlacar : oddSimDB;

        let content;
        if (hasHyphen) {
            if (mostrarOdds && oddParaMostrar) {
                content = (
                    <>
                      <div style={{ fontSize: '11px', lineHeight: '1' }}>{rawPlacar}</div>
                      <div style={{ color: '#ffcc00', fontSize: '8.5px', fontWeight: 'bold', lineHeight: '1', marginTop: '1px' }}>{oddParaMostrar}</div>
                    </>
                );
            } else {
                content = rawPlacar;
            }
        } else if (oddParaMostrar) {
            if (mostrarOdds) {
                content = <div style={{ color: '#ffcc00', fontSize: '10px', fontWeight: 'bold' }}>{oddParaMostrar}</div>;
            } else {
                content = <div style={{ color: '#888', fontSize: '8px' }}> - </div>;
            }
        } else {
            let emptyChar = (rawPlacar === "?" || rawPlacar === "-") ? rawPlacar : "-";
            content = <div style={{ color: '#888', fontSize: '8px' }}> {emptyChar} </div>;
        }
        
        return (
          <div key={chave} className={`grid-cell result-cell ${corDefinitiva} ${classesExtras}`} title={`${res.home || '?'} x ${res.away || '?'}`} onClick={() => setPlacarFiltro(placarFiltro === res.placar ? null : res.placar)} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', lineHeight: '1.2' }}>
            {content}
          </div>
        );
      }
    }
    return <div key={chave} className={`grid-cell empty-cell ${classesExtras}`}>-</div>;
  };

  const sinaisDessaLiga = sinaisAtivos.filter(s => s.liga === ligaSelecionada);
  const nomeMercadoAtual = mercadosDrop.find(m => m.id === mercadoAtivo)?.label.toUpperCase();

  return (
    <div className="dashboard-wrapper">
      <div className="top-bar-user">
        <div className="user-info">👤 Logado como: {usuarioLogado.email} {isAdmin ? '(ADMIN)' : '(CLIENTE)'}</div>
        <button className="btn-logout" onClick={fazerLogout}>SAIR DO SISTEMA</button>
      </div>

      <h2 className="main-logo" style={{textAlign: 'center', margin: '20px 0', fontSize: '26px'}}>TH JURUNAS <span>SYSTEM</span></h2>

      {showMenuTop && (
        <div style={{ padding: '0 15px', maxWidth: '800px', margin: '0 auto 15px auto' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {canViewBacktest && <button onClick={() => setAbaAtual(abaAtual === 'BACKTEST' ? null : 'BACKTEST')} style={{flex: '1', minWidth: '120px', padding: '10px', borderRadius: '8px', background: abaAtual === 'BACKTEST' ? '#ffcc00' : '#111', color: abaAtual === 'BACKTEST' ? '#000' : '#ffcc00', border: '1px solid #ffcc00', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', transition: '0.3s'}}>🧪 BACKTEST</button>}
            {canViewGatilhos && <button onClick={() => setAbaAtual(abaAtual === 'GATILHOS' ? null : 'GATILHOS')} style={{flex: '1', minWidth: '120px', padding: '10px', borderRadius: '8px', background: abaAtual === 'GATILHOS' ? '#9FC131' : '#111', color: abaAtual === 'GATILHOS' ? '#000' : '#9FC131', border: '1px solid #9FC131', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', transition: '0.3s'}}>🎯 GATILHOS</button>}
            {canViewIA && <button onClick={() => setAbaAtual(abaAtual === 'IA' ? null : 'IA')} style={{flex: '1', minWidth: '120px', padding: '10px', borderRadius: '8px', background: abaAtual === 'IA' ? '#00f2fe' : '#111', color: abaAtual === 'IA' ? '#000' : '#00f2fe', border: '1px solid #00f2fe', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', transition: '0.3s'}}>🤖 RADAR I.A.</button>}
            {canViewClientes && <button onClick={() => setAbaAtual(abaAtual === 'CLIENTES' ? null : 'CLIENTES')} style={{flex: '1', minWidth: '120px', padding: '10px', borderRadius: '8px', background: abaAtual === 'CLIENTES' ? '#ff4444' : '#111', color: abaAtual === 'CLIENTES' ? '#fff' : '#ff4444', border: '1px solid #ff4444', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', transition: '0.3s'}}>👥 CLIENTES</button>}
          </div>

          {abaAtual === 'BACKTEST' && canViewBacktest && (
            <div className="cadastro-card" style={{border: '1px solid #ffcc00', background: 'rgba(255, 204, 0, 0.05)', marginTop: '15px', animation: 'fadeIn 0.3s ease'}}>
              <h3 className="section-title" style={{marginBottom: '10px', color: '#ffcc00'}}>🧪 LABORATÓRIO DE BACKTEST (3 TIROS AO VIVO)</h3>
              <div style={{fontSize: '12px', color: '#ccc', marginBottom: '15px'}}>A ferramenta vai calcular se, <strong>nos 3 jogos seguintes imediatos</strong> após o gatilho, nós teríamos obtido pelo menos 1 Green.</div>
              <div style={{display: 'flex', gap: '10px', marginBottom: '15px'}}>
                <select className="flet-input" style={{flex: '1'}} value={backtestLiga} onChange={(e) => setBacktestLiga(e.target.value)}>
                  <option value="Todas">Todas as Ligas</option>
                  <option value="Copa">Copa</option>
                  <option value="Euro">Euro</option>
                  <option value="Premier">Premier</option>
                  <option value="Sul-Americana">Sul-Americana</option>
                </select>
                <input className="flet-input" style={{flex: '2'}} placeholder="Ex: 0-0, 1-1" value={backtestInput} onChange={(e) => setBacktestInput(e.target.value)} />
              </div>
              <button className="btn-flet-save" style={{background: '#ffcc00', color: '#000', width: '100%'}} onClick={executarBacktest} disabled={carregandoBacktest}>{carregandoBacktest ? "⏳ CALCULANDO..." : "🔍 TESTAR ESTATÍSTICA"}</button>
              {resultadoBacktest && !resultadoBacktest.erro && (
                <div style={{marginTop: '15px', background: '#111', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${resultadoBacktest.assertividade >= 70 ? '#9FC131' : '#ff4444'}`}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}><span style={{color: '#fff', fontWeight: 'bold'}}>Resultado:</span><span style={{color: resultadoBacktest.assertividade >= 70 ? '#9FC131' : '#ff4444', fontWeight: 'bold', fontSize: '18px'}}>{resultadoBacktest.assertividade}% Win Rate</span></div>
                  <div style={{fontSize: '12px', color: '#ccc', lineHeight: '1.6'}}>A sequência <strong style={{color: '#ffcc00'}}>[{backtestInput.toUpperCase()}]</strong> apareceu <strong>{resultadoBacktest.tentativas} vezes</strong>.<br/>Nós pegamos o Green em <strong>{resultadoBacktest.greens} ocasiões</strong> (com até 3 tiros).</div>
                </div>
              )}
            </div>
          )}

          {abaAtual === 'GATILHOS' && canViewGatilhos && (
            <div style={{animation: 'fadeIn 0.3s ease'}}>
              <div className="cadastro-card" style={{marginTop: '15px'}}>
                <label>NOME DA ESTRATÉGIA</label>
                <input className="flet-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Gatilho Ambas" />
                <label className="mt-20">SEQUÊNCIA DE GATILHO (+2.5, 0-1, AMBAS)</label>
                <div className="input-row">
                  <input className="flet-input" value={inputValor} onChange={(e) => setInputValor(e.target.value)} placeholder="Ex: +1.5, 0-0, +1.5" />
                  <button className="btn-flet-add" onClick={adicionarBloco}>+</button>
                </div>
                <div className="preview-timeline">{sequencia.map((s) => <div key={s.id} className="mini-flet-box" onClick={() => setSequencia(sequencia.filter(x => x.id !== s.id))}>{s.valor}</div>)}</div>
                <button className="btn-flet-save" style={{marginTop: '15px'}} onClick={salvarDados}>ATIVAR NOVO GATILHO</button>
              </div>
              <div className="active-strategies" style={{marginTop: '15px'}}>
                <h3 className="section-title">GATILHOS ATIVOS NO SERVIDOR</h3>
                {estrategias.map(est => {
                  let padraoVisual = [];
                  try { padraoVisual = typeof est.padrao_visual === 'string' ? JSON.parse(est.padrao_visual) : est.padrao_visual; } catch(e) { padraoVisual = []; }
                  return (
                    <div key={est.id} className="mini-est-card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div><strong>{est.nome}</strong><div className="steps-row" style={{display: 'flex', gap: '4px', marginTop: '5px'}}>{padraoVisual?.map((p, i) => <span key={i} className="mini-flet-box" style={{padding: '2px 5px', fontSize: '10px'}}>{p.valor}</span>)}</div></div>
                      <button onClick={() => deletarEstrategia(est.id)} style={{background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px'}}>EXCLUIR</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {abaAtual === 'IA' && canViewIA && (
            <div className="cadastro-card" style={{marginTop: '15px', border: '1px solid #00f2fe', background: 'rgba(0, 242, 254, 0.05)', animation: 'fadeIn 0.3s ease'}}>
              <h3 className="section-title" style={{marginBottom: '10px', color: '#00f2fe'}}>🤖 RADAR I.A. (PADRÕES OURO)</h3>
              <div style={{fontSize: '12px', color: '#ccc', marginBottom: '15px'}}>A Inteligência Artificial analisa o histórico absoluto de jogos e sugere padrões com alta assertividade:</div>
              {dicasIA.length === 0 ? (
                <div style={{color: '#888', fontSize: '13px', textAlign: 'center'}}>Nenhum padrão forte encontrado hoje ainda.</div>
              ) : (
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {dicasIA.map((dica, idx) => (
                    <div key={idx} className="ia-dica-card" style={{background: '#1a1a1a', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #00f2fe'}}>
                      <div style={{display: 'flex', justifyContent: 'space-between'}}><span style={{fontWeight: 'bold', color: '#ffcc00'}}>{dica.liga}</span><span style={{color: '#9FC131', fontWeight: 'bold'}}>{dica.assertividade}% Win Rate</span></div>
                      <div style={{marginTop: '8px', display: 'flex', gap: '5px', flexWrap: 'wrap'}}>{dica.padrao.map((p, pIdx) => <span key={pIdx} className="mini-flet-box">{p.valor}</span>)}</div>
                      <div style={{fontSize: '10px', color: '#888', marginTop: '5px'}}>Ocorreu {dica.amostras} vezes recentemente.</div>
                      {isAdmin && (
                        <button className="btn-flet-save" style={{marginTop: '10px', padding: '5px 10px', fontSize: '11px', background: '#00f2fe', color: '#000', width: '100%'}} onClick={() => copiarDicaIA(dica)}>⚡ COPIAR E ATIVAR GATILHO</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {abaAtual === 'CLIENTES' && canViewClientes && (
            <div className="cadastro-card" style={{marginTop: '15px', border: '1px solid rgba(34, 34, 34, 1)', animation: 'fadeIn 0.3s ease'}}>
              <h3 className="section-title" style={{marginBottom: '10px', color: '#ff4444'}}>👥 CADASTRAR NOVO CLIENTE</h3>
              <div className="input-row" style={{marginBottom: '20px'}}>
                <input className="flet-input" value={novoUserEmail} onChange={(e) => setNovoUserEmail(e.target.value)} placeholder="Usuário" />
                <input className="flet-input" type="password" value={novoUserSenha} onChange={(e) => setNovoUserSenha(e.target.value)} placeholder="Senha" />
                <button className="btn-flet-save" style={{padding: '0 15px', width: 'auto'}} onClick={cadastrarCliente}>SALVAR</button>
              </div>

              <h3 className="section-title" style={{marginBottom: '10px', color: '#9FC131', marginTop: '20px', borderTop: '1px solid #333', paddingTop: '20px'}}>⚙️ GERENCIAR ACESSOS VIP</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                {listaClientes.map(cliente => (
                  <div key={cliente.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #333'}}>
                    <span style={{color: '#fff', fontSize: '13px', fontWeight: 'bold'}}>{cliente.email}</span>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <button onClick={() => togglePermissao(cliente.id, 'acesso_backtest', cliente.acesso_backtest)} style={{padding: '5px 10px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: 'none', background: cliente.acesso_backtest ? '#ffcc00' : '#333', color: cliente.acesso_backtest ? '#000' : '#888'}}>
                        {cliente.acesso_backtest ? '🧪 B-TEST: ON' : '🧪 B-TEST: OFF'}
                      </button>
                      <button onClick={() => togglePermissao(cliente.id, 'acesso_ia', cliente.acesso_ia)} style={{padding: '5px 10px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer', border: 'none', background: cliente.acesso_ia ? '#00f2fe' : '#333', color: cliente.acesso_ia ? '#000' : '#888'}}>
                        {cliente.acesso_ia ? '🤖 I.A: ON' : '🤖 I.A: OFF'}
                      </button>
                    </div>
                  </div>
                ))}
                {listaClientes.length === 0 && <div style={{color: '#888', fontSize: '12px', textAlign: 'center'}}>Nenhum cliente cadastrado.</div>}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: '0 15px', maxWidth: '800px', margin: '0 auto 20px auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
          <button onClick={() => { setMostrarRankingMobile(!mostrarRankingMobile); setMostrarMaximasMobile(false); }} style={{ flex: '1', minWidth: '140px', padding: '12px', borderRadius: '8px', background: mostrarRankingMobile ? '#9FC131' : '#111', color: mostrarRankingMobile ? '#000' : '#9FC131', border: '1px solid #9FC131', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', transition: '0.3s' }}>
            🏆 RANKING TIMES
          </button>
          <button onClick={() => { setMostrarMaximasMobile(!mostrarMaximasMobile); setMostrarRankingMobile(false); }} style={{ flex: '1', minWidth: '140px', padding: '12px', borderRadius: '8px', background: mostrarMaximasMobile ? '#ff4444' : '#111', color: mostrarMaximasMobile ? '#fff' : '#ff4444', border: '1px solid #ff4444', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', transition: '0.3s' }}>
            ⚠️ MÁXIMAS (RED)
          </button>
        </div>

        {mostrarRankingMobile && (
          <div style={{ background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #333', marginBottom: '20px', animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ color: '#9FC131', textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>📊 TOP 10 TIMES - {nomeMercadoAtual}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
              {rankingTimes.map((item, i) => (
                <div key={i} style={{ background: '#222', padding: '10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: '#888', fontWeight: 'bold' }}>{i + 1}º</span>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>{item.time}</span>
                  <span style={{ color: '#9FC131', fontWeight: 'bold' }}>{item.porcentagem}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {mostrarMaximasMobile && (
          <div style={{ background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #333', marginBottom: '20px', animation: 'fadeIn 0.3s ease' }}>
            <h3 style={{ color: '#ff4444', textAlign: 'center', marginBottom: '15px', fontSize: '14px' }}>⚠️ MÁXIMA E JEJUM ATUAL - {nomeMercadoAtual}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {estatisticasComp.map((comp, i) => {
                const taNaMaxima = comp.jejum_atual === comp.jogos_sem_ambas && comp.jogos_sem_ambas >= 4;
                return (
                  <div key={i} style={{ background: '#222', padding: '12px', borderRadius: '6px', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '12px', border: taNaMaxima ? '1px solid #ff4444' : 'none', boxShadow: taNaMaxima ? '0 0 10px rgba(255,68,68,0.2)' : 'none' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold', marginBottom: '5px' }}>{comp.liga}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                      <span style={{ color: '#ff4444', fontSize: '24px', fontWeight: 'bold' }}>{comp.jejum_atual}</span>
                      <span style={{ color: '#888', fontSize: '10px' }}>JEJUM ATUAL</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#ccc', marginTop: '6px', background: '#1a1a1a', padding: '4px 8px', borderRadius: '4px', width: '100%', textAlign: 'center' }}>
                      Máxima do Dia: <strong style={{ color: '#fff', fontSize: '12px' }}>{comp.jogos_sem_ambas}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {alertasMaximas.length > 0 && (
        <div style={{ padding: '0 15px', maxWidth: '800px', margin: '0 auto 20px auto', animation: 'fadeIn 0.5s ease' }}>
          <div style={{ background: '#111', padding: '15px', borderRadius: '8px', border: '1px solid #ff4444', boxShadow: '0 0 15px rgba(255, 68, 68, 0.2)' }}>
            <h3 style={{ color: '#ff4444', textAlign: 'center', marginBottom: '15px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ animation: 'piscarAlerta 1s infinite' }}>🔥</span> OPORTUNIDADE: LIGA NO LIMITE DA MÁXIMA
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {alertasMaximas.map((alerta, i) => (
                <div key={i} style={{ background: '#222', padding: '12px', borderRadius: '6px', borderLeft: '4px solid #ff4444' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>🏆 {alerta.liga}</span>
                    <span style={{ color: '#ffcc00', fontSize: '10px', fontWeight: 'bold', background: 'rgba(255, 204, 0, 0.1)', padding: '3px 6px', borderRadius: '4px' }}>
                      {mercadosDrop.find(m => m.id === mercadoAtivo)?.label}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#ccc', lineHeight: '1.4' }}>
                    O jejum atual atingiu a máxima do dia (<strong style={{color: '#ff4444', fontSize: '14px'}}>{alerta.streak} jogos</strong>). Excelente oportunidade para entrar no Rompimento!
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* OS SELETORES: MERCADO E VISUALIZAÇÃO DE ODDS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="league-tabs" style={{ marginBottom: 0 }}>
          {ligasDisponiveis.map(liga => <button key={liga} className={`tab-btn ${ligaSelecionada === liga ? 'active' : ''}`} onClick={() => { setLigaSelecionada(liga); setPlacarFiltro(null); }}>{liga}</button>)}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#888' }}>MERCADO:</span>
            <select 
              className="flet-input" 
              style={{ width: 'auto', padding: '6px 10px', borderRadius: '8px', border: '1px solid #9FC131', color: '#9FC131', fontWeight: 'bold', cursor: 'pointer', background: '#111' }}
              value={mercadoAtivo}
              onChange={(e) => setMercadoAtivo(e.target.value)}
            >
              {mercadosDrop.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#888' }}>VISUALIZAÇÃO:</span>
            <select 
              className="flet-input" 
              style={{ width: 'auto', padding: '6px 10px', borderRadius: '8px', border: '1px solid #00f2fe', color: '#00f2fe', fontWeight: 'bold', cursor: 'pointer', background: '#111' }}
              value={mostrarOdds ? "COM_ODD" : "SEM_ODD"}
              onChange={(e) => setMostrarOdds(e.target.value === "COM_ODD")}
            >
              <option value="SEM_ODD">Sem Odds</option>
              <option value="COM_ODD">Com Odds</option>
            </select>
          </div>
        </div>
      </div>

      <div className="matriz-container">
        <div className="matriz-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>
            📡 RADAR - {ligaSelecionada.toUpperCase()}
            {sinaisDessaLiga.length > 0 && <span style={{marginLeft: '15px', color: '#00f2fe', fontSize: '12px', animation: 'piscarAlerta 1s infinite'}}>⚠️ SINAL DETECTADO! PREPARE-SE PARA ENTRAR</span>}
          </h3>
          <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            {ultimaAtualizacao && <span style={{fontSize: '11px', color: '#888'}}>Atualizado às {ultimaAtualizacao}</span>}
            {placarFiltro && <span style={{ fontSize: '12px', color: '#ffcc00', fontWeight: 'bold', padding: '5px 10px', background: 'rgba(255, 204, 0, 0.1)', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setPlacarFiltro(null)}>🔍 Buscando placar: {placarFiltro} (Limpar)</span>}
          </div>
        </div>

        <div className="grid-matriz-wrapper">
          <div className="grid-matriz">
            
            <div style={{display: 'contents'}}>
              <div className="grid-cell empty-cell" style={{ border: 'none', background: 'transparent' }}></div>
              {minutosCols.map(min => {
                const s = statsPorMinuto[min];
                const corPerc = s.perc >= 50 ? '#9FC131' : '#ff4444'; 
                return (
                  <div key={`stat-${min}`} className="grid-cell top-stat-cell">
                    <span style={{color: '#ffcc00', fontWeight: 'bold', fontSize: '11px', lineHeight: '1'}}>{s.greens}</span>
                    <span style={{color: corPerc, fontSize: '9px', lineHeight: '1', marginTop: '2px'}}>{s.perc}%</span>
                  </div>
                );
              })}
              <div className="grid-cell empty-cell" style={{ border: 'none', background: 'transparent' }}></div>
              <div className="grid-cell empty-cell" style={{ border: 'none', background: 'transparent' }}></div>
            </div>

            <div className="grid-cell header-cell">H/M</div>
            {minutosCols.map(min => <div key={`h-${min}`} className="grid-cell header-cell">{min}</div>)}
            <div className="grid-cell header-cell" style={{fontSize: '11px'}}>Dados</div>
            <div className="grid-cell header-cell" style={{fontSize: '14px'}}>⚽</div>

            {horasParaMostrar.map(hora => {
              let totalValidosRow = 0; let totalGreensRow = 0; let totalGolsRow = 0;
              const linhaDados = linhasDaLiga.find(m => Number(m.hora) === Number(hora));
              if (linhaDados && linhaDados.resultados) {
                Object.values(linhaDados.resultados).forEach(jogo => {
                  if (calcularCorDinamica(jogo.placar, mercadoAtivo) !== "empty-cell") {
                    const [c, f] = String(jogo.placar).split("-").map(Number);
                    if (!isNaN(c) && !isNaN(f)) {
                      totalValidosRow++;
                      if (calcularCorDinamica(jogo.placar, mercadoAtivo) === 'bg-green') totalGreensRow++;
                      totalGolsRow += (c + f);
                    }
                  }
                });
              }
              const percRow = totalValidosRow > 0 ? Math.round((totalGreensRow / totalValidosRow) * 100) : 0;
              const corPercRow = percRow >= 50 ? '#9FC131' : '#ff4444';

              return (
                <div style={{display: 'contents'}} key={`row-${hora}`}>
                  <div className="grid-cell hour-cell">{hora}h</div>
                  {minutosCols.map(min => renderCell(hora, min))}
                  <div className="grid-cell side-stat-cell" style={{ color: corPercRow }}>({percRow}%)</div>
                  <div className="grid-cell side-stat-cell" style={{color: '#fff'}}>{totalGolsRow}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;