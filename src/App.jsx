import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import './App.css';

function App() {
  const [estrategias, setEstrategias] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [nome, setNome] = useState('');
  const [sequencia, setSequencia] = useState([]);
  const [inputValor, setInputValor] = useState('');

  // Simulação de dados de Ranking e Máximas (Vindo do seu Robô na AWS)
  const ranking = [
    { nome: 'Padrão 2.5/0x0', win: '94%' },
    { nome: 'Mirroring AM', win: '88%' },
    { nome: 'Over HT 0.5', win: '82%' }
  ];

  const maximas = [
    { label: 'AMBAS MARCAM', valor: 14 },
    { label: 'OVER 2.5 GOLS', valor: 8 },
    { label: 'PLACAR 0x0', valor: 21 },
    { label: 'CASA VENCE', valor: 6 }
  ];

  useEffect(() => { buscarDados(); }, []);

  async function buscarDados() {
    const { data: est } = await supabase.from('estrategias').select('*');
    const { data: hist } = await supabase.from('historico_entradas').select('*').order('created_at', { ascending: false }).limit(60);
    if (est) setEstrategias(est);
    if (hist) setHistorico(hist);
  }

  const adicionarBloco = () => {
    if (!inputValor) return;
    setSequencia([...sequencia, { id: Date.now(), valor: inputValor.toUpperCase() }]);
    setInputValor('');
  };

  return (
    <div className="dashboard-container">
      
      {/* --- COLUNA ESQUERDA: RANKING --- */}
      <aside className="col-ranking">
        <h3 className="section-title">🏆 RANKING DIA</h3>
        <div className="list-container">
          {ranking.map((item, i) => (
            <div key={i} className="rank-card">
              <span className="pos">{i + 1}º</span>
              <span className="name">{item.nome}</span>
              <span className="perc">{item.win}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* --- COLUNA CENTRAL: CADASTRO --- */}
      <main className="col-center">
        <h2 className="main-logo">TH JURUNAS <span>SYSTEM</span></h2>
        
        <div className="cadastro-card">
          <label>NOME DA ESTRATÉGIA</label>
          <input className="flet-input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Padrão VIP" />
          
          <label className="mt-20">MONTAR SEQUÊNCIA DE GATILHO</label>
          <div className="input-row">
            <input className="flet-input" value={inputValor} onChange={(e) => setInputValor(e.target.value)} placeholder="0x0, 2.5..." />
            <button className="btn-flet-add" onClick={adicionarBloco}>ADICIONAR</button>
          </div>

          <div className="preview-timeline">
            {sequencia.map((s, i) => (
              <div key={s.id} className="mini-flet-box">
                {s.valor}
                {i < sequencia.length - 1 && <span className="arrow-flet">➜</span>}
              </div>
            ))}
          </div>

          <button className="btn-flet-save">ATIVAR NO SERVIDOR</button>
        </div>

        {/* ESTRATÉGIAS ATIVAS NO MEIO */}
        <div className="active-strategies">
          {estrategias.map(est => (
            <div key={est.id} className="mini-est-card">
              <strong>{est.nome}</strong>
              <div className="steps-row">
                {est.padrao_visual?.map((p, i) => <span key={i}>{p.valor}</span>)}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- COLUNA DIREITA: MÁXIMAS --- */}
      <aside className="col-maximas">
        <h3 className="section-title">📊 MÁXIMAS ATUAIS</h3>
        <div className="list-container">
          {maximas.map((m, i) => (
            <div key={i} className="maxima-item">
              <span className="m-label">{m.label}</span>
              <div className="m-value-box">
                <span className="m-num">{m.valor}</span>
                <span className="m-text">JOGOS SEM</span>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* --- RODAPÉ: HISTÓRICO DE RESULTADOS --- */}
      <footer className="row-history">
        <div className="history-header">
          <h3>🕒 HISTÓRICO DE RESULTADOS (ÚLTIMOS JOGOS)</h3>
          <span className="live-indicator">LIVE MONITORING</span>
        </div>
        <div className="balls-grid">
          {historico.map((h, i) => (
            <div key={i} className={`ball ${h.resultado?.includes('Ambas') ? 'green' : 'red'}`}>
              {h.resultado?.includes('Ambas') ? 'A' : 'X'}
            </div>
          ))}
        </div>
      </footer>

    </div>
  );
}

export default App;