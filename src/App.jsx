import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './App.css';

function App() {
  const [usuarioLogado, setUsuarioLogado] = useState(null);
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
  
  const [nome, setNome] = useState('');
  const [sequencia, setSequencia] = useState([]);
  const [inputValor, setInputValor] = useState('');

  const [ligaSelecionada, setLigaSelecionada] = useState('Copa');
  const [placarFiltro, setPlacarFiltro] = useState(null); 
  const [mercadoAtivo, setMercadoAtivo] = useState('AMBAS');

  const ligasDisponiveis = ['Copa', 'Euro', 'Sul-Americana', 'Premier'];
  const [erroDB, setErroDB] = useState('');
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState('');

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
    if (error || !data) setErroLogin('Usuário ou senha incorretos!');
    else setUsuarioLogado(data);
  };

  const fazerLogout = () => {
    setUsuarioLogado(null);
    setLoginEmail('');
    setLoginSenha('');
  };

  const cadastrarCliente = async () => {
    if (!novoUserEmail || !novoUserSenha) return alert("Preencha email e senha do cliente!");
    const { error } = await supabase.from('usuarios').insert([{ email: novoUserEmail, senha: novoUserSenha, role: 'user' }]);
    if (error) alert("❌ Erro ao cadastrar: " + error.message);
    else {
      alert("✅ Cliente cadastrado com sucesso!");
      setNovoUserEmail(''); setNovoUserSenha('');
    }
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
    buscarDados(); 
    const intervalId = setInterval(() => { buscarDados(); }, 10000); 
    return () => clearInterval(intervalId);
  }, [usuarioLogado]);

  useEffect(() => {
    if (matrizJogos.length > 0) calcularEstatisticasGlobais(matrizJogos);
  }, [matrizJogos, ligaSelecionada, estrategias, mercadoAtivo]);

  async function buscarDados() {
    setErroDB('');
    const { data: est, error: erroEst } = await supabase.from('estrategias').select('*').order('created_at', { ascending: false });
    if (est) setEstrategias([...est]);

    const { data: matriz, error: erroMat } = await supabase.from('matriz_resultados').select('*').limit(500);
    if (erroMat) {
      setErroDB("Erro ao carregar matriz: " + erroMat.message);
    } else if (matriz) {
      setMatrizJogos([...matriz]); 
      setUltimaAtualizacao(new Date().toLocaleTimeString()); 
    }
  }

  const deletarEstrategia = async (id) => {
    const { error } = await supabase.from('estrategias').delete().eq('id', id);
    if (error) alert("Erro ao excluir: " + error.message);
    else buscarDados();
  };

  const normalizar = (texto) => String(texto).trim().toLowerCase();

  const checarPlacar = (placar, condicao) => {
    if (!placar || placar === "-") return false;
    const p_limpo = String(placar).trim();
    const [c, f] = p_limpo.split("-").map(Number);
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
    return p_limpo === cond;
  };

  const calcularCorDinamica = (placar, mercado) => {
    if (!placar || placar === "-") return "empty-cell";
    const [c, f] = String(placar).split("-").map(Number);
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
    const ligasUnicas = [...new Set(dadosMatriz.map(m => m.liga))];

    const dadosFiltradosParaRanking = dadosMatriz.filter(m => normalizar(m.liga) === normalizar(ligaSelecionada));
    dadosFiltradosParaRanking.forEach(linha => {
      if (linha.resultados) {
        Object.values(linha.resultados).forEach(jogo => {
          if (jogo.home && jogo.away && jogo.placar !== "-") {
            if (!timesStats[jogo.home]) timesStats[jogo.home] = { jogos: 0, hits: 0 };
            if (!timesStats[jogo.away]) timesStats[jogo.away] = { jogos: 0, hits: 0 };
            timesStats[jogo.home].jogos += 1;
            timesStats[jogo.away].jogos += 1;
            
            const corDinamica = calcularCorDinamica(jogo.placar, mercadoAtivo);
            if (corDinamica === 'bg-green') {
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
      let todosJogosLiga = [];
      
      linhasDessaLiga.forEach(linha => {
        if (!linha.resultados) return;
        Object.keys(linha.resultados).forEach(min => {
          const jogo = linha.resultados[min];
          if (jogo.placar !== "-") {
            todosJogosLiga.push({ 
              hora: Number(linha.hora), 
              min: Number(min), 
              placar: jogo.placar,
              corDinamica: calcularCorDinamica(jogo.placar, mercadoAtivo) 
            });
          }
        });
      });

      const horasDaLiga = sortHoursDescending([...new Set(todosJogosLiga.map(j => j.hora))]);

      horasDaLiga.forEach(horaAtual => {
        const jogosDessaHora = todosJogosLiga.filter(j => j.hora === horaAtual).sort((a, b) => a.min - b.min);

        estrategias.forEach(est => {
          let padraoArray = [];
          try { padraoArray = typeof est.padrao_visual === 'string' ? JSON.parse(est.padrao_visual) : est.padrao_visual; } 
          catch(e) { return; }
          
          if (!padraoArray || padraoArray.length === 0 || !est.ativa) return;
          const padrao = padraoArray.map(p => p.valor);
          const tamanho = padrao.length;

          for (let i = 0; i <= jogosDessaHora.length - tamanho; i++) {
            let match = true;
            let minsGatilho = [];
            
            for (let j = 0; j < tamanho; j++) {
              if (!checarPlacar(jogosDessaHora[i+j].placar, padrao[j])) {
                match = false; break;
              }
              minsGatilho.push(jogosDessaHora[i+j].min); 
            }
            
            if (match) {
              let horaAlvo = horaAtual + 1;
              if (horaAlvo >= 24) horaAlvo -= 24;

              alertasGerados.push({
                liga: ligaNome,
                horaAlvo: horaAlvo,        
                minutosAlvo: minsGatilho     
              });
            }
          }
        });
      });

      const hourAge = {};
      horasDaLiga.forEach((h, idx) => hourAge[h] = idx);

      todosJogosLiga.sort((a, b) => {
        if (hourAge[a.hora] !== hourAge[b.hora]) return hourAge[b.hora] - hourAge[a.hora]; 
        return a.min - b.min; 
      });

      let maxStreak = 0;
      let currentStreak = 0;
      todosJogosLiga.forEach(jogo => {
        if (jogo.corDinamica === 'bg-red') {
          currentStreak++;
          if (currentStreak > maxStreak) maxStreak = currentStreak;
        } else if (jogo.corDinamica === 'bg-green') {
          currentStreak = 0;
        }
      });
      maximasPorLiga.push({ liga: ligaNome, jogos_sem_ambas: maxStreak });
    });

    setSinaisAtivos(alertasGerados);
    setEstatisticasComp(maximasPorLiga);
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
    else { setNome(''); setSequencia([]); buscarDados(); }
  };

  if (!usuarioLogado) {
    return (
      <div className="login-container">
        <div className="login-box">
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

  const isAdmin = usuarioLogado.role === 'admin';
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

  let celulasMaxima = [];
  let streakAtual = [];
  
  const horasDescLocal = sortHoursDescending([...new Set(linhasDaLiga.map(m => Number(m.hora)))]);
  const hourAgeLocal = {};
  horasDescLocal.forEach((h, idx) => hourAgeLocal[h] = idx);
  
  let todosJogosRadar = [];
  linhasDaLiga.forEach(linha => {
    if(linha.resultados) {
      Object.keys(linha.resultados).forEach(min => {
        const jogo = linha.resultados[min];
        if (jogo.placar !== "-") {
          todosJogosRadar.push({ 
            hora: Number(linha.hora), 
            min: Number(min), 
            corDinamica: calcularCorDinamica(jogo.placar, mercadoAtivo)
          });
        }
      });
    }
  });

  todosJogosRadar.sort((a, b) => {
    if (hourAgeLocal[a.hora] !== hourAgeLocal[b.hora]) return hourAgeLocal[b.hora] - hourAgeLocal[a.hora];
    return a.min - b.min;
  });

  todosJogosRadar.forEach(jogo => {
    if (jogo.corDinamica === 'bg-red') {
      streakAtual.push(`${jogo.hora}-${jogo.min}`);
      if (streakAtual.length > celulasMaxima.length) celulasMaxima = [...streakAtual];
    } else if (jogo.corDinamica === 'bg-green') streakAtual = [];
  });
  const setMaximas = new Set(celulasMaxima);

  // ========================================================
  // 🔥 LÓGICA DE ESTATÍSTICAS TOP (POR MINUTO) 
  // ========================================================
  const statsPorMinuto = {};
  minutosCols.forEach(min => {
    let totalValidos = 0;
    let totalGreens = 0;
    linhasDaLiga.forEach(linha => {
      if (linha.resultados && linha.resultados[String(min)]) {
        const jogo = linha.resultados[String(min)];
        if (jogo.placar !== "-") {
          totalValidos++;
          if (calcularCorDinamica(jogo.placar, mercadoAtivo) === 'bg-green') totalGreens++;
        }
      }
    });
    const perc = totalValidos > 0 ? Math.round((totalGreens / totalValidos) * 100) : 0;
    statsPorMinuto[min] = { greens: totalGreens, perc };
  });

  const renderCell = (hora, min) => {
    const chave = `${hora}-${min}`;
    const isTarget = sinaisAtivos.some(s => s.liga === ligaSelecionada && s.horaAlvo === Number(hora) && s.minutosAlvo.includes(Number(min)));

    if (matrizJogos.length > 0) {
      const linha = linhasDaLiga.find(m => Number(m.hora) === Number(hora));
      if (linha && linha.resultados && linha.resultados[String(min)]) {
        const res = linha.resultados[String(min)];
        const isMaxima = setMaximas.has(chave);
        const isSelected = placarFiltro === res.placar;
        
        const corDefinitiva = calcularCorDinamica(res.placar, mercadoAtivo);

        let classesExtras = "";
        if (isAdmin && isMaxima) classesExtras += " blink-maxima";
        if (isSelected) classesExtras += " selected-score";
        if (isAdmin && isTarget) classesExtras += " target-cell";
        
        const isFuturo = res.placar === "-";
        const oddVeioVazia = res.odd_sim === "None" || !res.odd_sim || res.odd_sim === "-";

        return (
          <div 
            key={chave} 
            className={`grid-cell result-cell ${corDefinitiva} ${classesExtras}`} 
            title={`${res.home || '?'} x ${res.away || '?'}`} 
            onClick={() => setPlacarFiltro(placarFiltro === res.placar ? null : res.placar)} 
            style={{ 
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              justifyContent: 'center', alignItems: 'center', lineHeight: '1.2'
            }}
          >
            {isFuturo ? (
               oddVeioVazia ? (
                 <div style={{ color: '#888', fontSize: '8px' }}> - </div>
               ) : (
                 <div style={{ color: '#ffcc00', fontSize: '10px', fontWeight: 'bold' }}>{res.odd_sim}</div>
               )
            ) : (
               res.placar
            )}
          </div>
        );
      }
      return <div key={chave} className={`grid-cell empty-cell ${isAdmin && isTarget ? 'target-cell' : ''}`}>-</div>;
    }
    return <div key={chave} className="grid-cell empty-cell">-</div>;
  };

  const sinaisDessaLiga = sinaisAtivos.filter(s => s.liga === ligaSelecionada);
  const nomeMercadoAtual = mercadosDrop.find(m => m.id === mercadoAtivo)?.label.toUpperCase();

  return (
    <div className="dashboard-wrapper">
      <div className="top-bar-user">
        <div className="user-info">👤 Logado como: {usuarioLogado.email} {isAdmin ? '(ADMIN)' : '(CLIENTE)'}</div>
        <button className="btn-logout" onClick={fazerLogout}>SAIR DO SISTEMA</button>
      </div>

      {erroDB && <div style={{background: '#ff4444', color: '#fff', padding: '10px', textAlign: 'center', fontWeight: 'bold'}}>{erroDB}</div>}

      {isAdmin && (
        <div className="top-section">
          <aside className="col-ranking">
            <h3 className="section-title">📊 TIMES % {nomeMercadoAtual}</h3>
            <div className="list-container">
              {rankingTimes.map((item, i) => (
                <div key={i} className="rank-card"><span className="pos">{i + 1}º</span><span className="name">{item.time}</span><span className="perc">{item.porcentagem}%</span></div>
              ))}
            </div>
          </aside>

          <main className="col-center">
            <h2 className="main-logo">TH JURUNAS <span>SYSTEM</span></h2>
            
            <div className="cadastro-card">
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

            <div className="cadastro-card" style={{marginTop: '15px', border: '1px solid rgba(34, 34, 34, 1)'}}>
              <h3 className="section-title" style={{marginBottom: '10px', color: '#9FC131'}}>👥 CADASTRAR NOVO CLIENTE</h3>
              <div className="input-row">
                <input className="flet-input" value={novoUserEmail} onChange={(e) => setNovoUserEmail(e.target.value)} placeholder="Usuário" />
                <input className="flet-input" type="password" value={novoUserSenha} onChange={(e) => setNovoUserSenha(e.target.value)} placeholder="Senha" />
                <button className="btn-flet-save" style={{padding: '0 15px', width: 'auto'}} onClick={cadastrarCliente}>SALVAR</button>
              </div>
            </div>

            <div className="active-strategies">
              <h3 className="section-title" style={{marginTop: '20px'}}>GATILHOS ATIVOS NO SERVIDOR</h3>
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
          </main>

          <aside className="col-maximas">
            <h3 className="section-title">⚠️ MÁXIMAS S/ {nomeMercadoAtual}</h3>
            <div className="list-container">
              {estatisticasComp.map((comp, i) => (
                <div key={i} className="maxima-item"><span className="m-label">{comp.liga}</span><div className="m-value-box"><span className="m-num">{comp.jogos_sem_ambas}</span><span className="m-text">JOGOS SEGUIDOS</span></div></div>
              ))}
            </div>
          </aside>
        </div>
      )}

      <div className="bottom-section" style={!isAdmin ? {marginTop: '50px'} : {}}>
        {!isAdmin && <h2 className="main-logo" style={{textAlign: 'center', marginBottom: '30px', fontSize: '28px'}}>TH JURUNAS <span>SYSTEM</span></h2>}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="league-tabs" style={{ marginBottom: 0 }}>
            {ligasDisponiveis.map(liga => <button key={liga} className={`tab-btn ${ligaSelecionada === liga ? 'active' : ''}`} onClick={() => { setLigaSelecionada(liga); setPlacarFiltro(null); }}>{liga}</button>)}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#888' }}>MERCADO:</span>
            <select 
              className="flet-input" 
              style={{ width: 'auto', padding: '8px 15px', borderRadius: '8px', border: '1px solid #9FC131', color: '#9FC131', fontWeight: 'bold', cursor: 'pointer' }}
              value={mercadoAtivo}
              onChange={(e) => setMercadoAtivo(e.target.value)}
            >
              {mercadosDrop.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
        </div>

        <div className="matriz-container">
          <div className="matriz-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>
              📡 RADAR - {ligaSelecionada.toUpperCase()}
              {isAdmin && sinaisDessaLiga.length > 0 && <span style={{marginLeft: '15px', color: '#00f2fe', fontSize: '12px', animation: 'piscarAlerta 1s infinite'}}>⚠️ SINAL DETECTADO! PREPARE-SE PARA ENTRAR</span>}
            </h3>
            <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
              {ultimaAtualizacao && <span style={{fontSize: '11px', color: '#888'}}>Atualizado às {ultimaAtualizacao}</span>}
              
              {placarFiltro && <span style={{ fontSize: '12px', color: '#ffcc00', fontWeight: 'bold', padding: '5px 10px', background: 'rgba(255, 204, 0, 0.1)', borderRadius: '4px', cursor: 'pointer' }} onClick={() => setPlacarFiltro(null)}>🔍 Buscando placar: {placarFiltro} (Limpar)</span>}
            </div>
          </div>

          <div className="grid-matriz-wrapper">
            <div className="grid-matriz">
              
              {/* ESTATÍSTICAS DO TOPO */}
              <div style={{display: 'contents'}}>
                <div className="grid-cell empty-cell" style={{ border: 'none', background: 'transparent' }}></div>
                {minutosCols.map(min => {
                  const s = statsPorMinuto[min];
                  const corPerc = s.perc >= 50 ? '#9FC131' : '#ff4444'; // 🔥 Verde se >= 50%, Vermelho se < 50%
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

              {/* CABEÇALHOS */}
              <div className="grid-cell header-cell">H/M</div>
              {minutosCols.map(min => <div key={`h-${min}`} className="grid-cell header-cell">{min}</div>)}
              <div className="grid-cell header-cell" style={{fontSize: '11px'}}>Dados</div>
              <div className="grid-cell header-cell" style={{fontSize: '14px'}}>⚽</div>

              {/* ROWS E ESTATÍSTICAS DA DIREITA */}
              {horasParaMostrar.map(hora => {
                let totalValidosRow = 0;
                let totalGreensRow = 0;
                let totalGolsRow = 0;

                const linhaDados = linhasDaLiga.find(m => Number(m.hora) === Number(hora));
                if (linhaDados && linhaDados.resultados) {
                  Object.values(linhaDados.resultados).forEach(jogo => {
                    if (jogo.placar !== "-" && jogo.placar) {
                      totalValidosRow++;
                      if (calcularCorDinamica(jogo.placar, mercadoAtivo) === 'bg-green') totalGreensRow++;
                      
                      const pParts = String(jogo.placar).split("-");
                      if (pParts.length === 2) {
                        const c = parseInt(pParts[0].trim(), 10);
                        const f = parseInt(pParts[1].trim(), 10);
                        if (!isNaN(c) && !isNaN(f)) {
                          totalGolsRow += (c + f);
                        }
                      }
                    }
                  });
                }
                const percRow = totalValidosRow > 0 ? Math.round((totalGreensRow / totalValidosRow) * 100) : 0;
                const corPercRow = percRow >= 50 ? '#9FC131' : '#ff4444'; // 🔥 Verde se >= 50%, Vermelho se < 50%

                return (
                  <div style={{display: 'contents'}} key={`row-${hora}`}>
                    <div className="grid-cell hour-cell">{hora}h</div>
                    {minutosCols.map(min => renderCell(hora, min))}
                    
                    <div className="grid-cell side-stat-cell" style={{ color: corPercRow }}>
                      ({percRow}%)
                    </div>
                    <div className="grid-cell side-stat-cell" style={{color: '#fff'}}>
                      {totalGolsRow}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;