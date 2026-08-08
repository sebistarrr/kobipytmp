import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ChevronDown, ExternalLink, Heart, Mail, Menu, Play, Search, Send, Sparkles, X } from 'lucide-react'
import './styles.css'

const CHANNEL_URL = 'https://www.youtube.com/@kobipy'
const TIPEEE_URL = 'https://fr.tipeee.com/kobipy/'
const CONTACT_EMAIL = 'contact@kobipy.fr' // A remplacer par l'adresse réelle

const videos = [
  { id:'K3jf5BFsPiw', title:'Pourquoi ne peut-on pas permuter limite et intégrale ?', category:'Analyse', views:'19 k vues', duration:'9:48', date:'2025', description:'Une exploration visuelle des hypothèses cachées derrière le passage à la limite sous le signe intégral.' },
  { id:'PCklKViZapo', title:"La continuité : un concept plus difficile qu'il n'y paraît", category:'Analyse', views:'20 k vues', duration:'11:25', date:'2025', description:"Comprendre intuitivement les différentes formes de continuité grâce à l'animation." },
  { id:'K-JRFkrq7CA', title:'Comprendre les convergences simple et uniforme', category:'Analyse', views:'26 k vues', duration:'9:17', date:'2024', description:"Deux notions proches en apparence, mais profondément différentes lorsqu'on les visualise." },
  { id:'Oigh-j52CqE', title:"La puissance de l'intégrale de Lebesgue", category:'Intégration', views:'81 k vues', duration:'16:41', date:'2024', description:"Pourquoi l'intégrale de Lebesgue dépasse-t-elle celle de Riemann ? Une réponse visuelle." },
  { id:'U2xmox321_k', title:"Où est le cercle ? L'intégrale de Gauss", category:'Géométrie', views:'62 k vues', duration:'6:32', date:'2023', description:"Un cercle invisible apparaît au cœur d'une intégrale célèbre." },
  { id:'37tG_qvBb3M', title:'La fonction de Weierstrass est un monstre mathématique', category:'Fonctions', views:'48 k vues', duration:'5:31', date:'2023', description:'Une fonction continue partout et dérivable nulle part, révélée image par image.' }
]

const latestVideo = videos[0]
const faqs = [
  ['À qui s’adressent les vidéos KobiPy ?', 'Aux curieux, étudiants et passionnés qui veulent comprendre les mathématiques par l’intuition, les animations et la visualisation, sans renoncer à la rigueur.'],
  ['Quels outils sont utilisés pour créer les animations ?', 'Les animations sont principalement réalisées avec Python, notamment Manim et Pygame, ainsi qu’avec Blender pour certaines scènes.'],
  ['Puis-je utiliser les vidéos dans un cadre pédagogique ?', 'Vous pouvez partager les liens vers les vidéos. Pour toute reproduction ou intégration plus large, contactez directement KobiPy.'],
  ['Comment soutenir la chaîne ?', 'Vous pouvez vous abonner, partager les vidéos ou contribuer directement via la page Tipeee de KobiPy.']
]

function App(){
  const [menu,setMenu]=useState(false), [category,setCategory]=useState('Toutes'), [query,setQuery]=useState(''), [openFaq,setOpenFaq]=useState(0), [activeVideo,setActiveVideo]=useState(null)
  const [contact,setContact]=useState({name:'',email:'',subject:'',message:''})
  const categories=['Toutes',...new Set(videos.map(v=>v.category))]
  const filtered=useMemo(()=>videos.filter(v=>(category==='Toutes'||v.category===category)&&v.title.toLowerCase().includes(query.toLowerCase())),[category,query])
  const go=id=>{document.getElementById(id)?.scrollIntoView({behavior:'smooth'});setMenu(false)}
  const sendContact=e=>{e.preventDefault();const subject=encodeURIComponent(contact.subject||`Message de ${contact.name}`);const body=encodeURIComponent(`Nom : ${contact.name}\nE-mail : ${contact.email}\n\n${contact.message}`);window.location.href=`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`}
  return <div>
    <header className="header"><div className="nav-wrap">
      <button className="brand" onClick={()=>go('accueil')}><img className="brand-logo" src="https://unavatar.io/youtube/kobipy" alt="Logo KobiPy"/><span><strong>KobiPy</strong><small>Maths en mouvement</small></span></button>
      <nav className={menu?'nav open':'nav'}>{[['accueil','Accueil'],['videos','Vidéos'],['apropos','À propos'],['stats','Statistiques'],['contact','Contact'],['faq','FAQ']].map(([id,l])=><button key={id} onClick={()=>go(id)}>{l}</button>)}</nav>
      <div className="header-actions"><a className="link-btn" href={CHANNEL_URL} target="_blank"><Play size={18} fill="currentColor"/> YouTube</a><a className="gold-btn" href={TIPEEE_URL} target="_blank"><Heart size={17}/> Soutenir</a></div>
      <button className="menu-btn" onClick={()=>setMenu(!menu)} aria-label="Menu">{menu?<X/>:<Menu/>}</button>
    </div></header>

    <main>
      <section id="accueil" className="hero"><div className="hero-inner">
        <div><div className="eyebrow"><Sparkles size={15}/> Mathématiques & informatique visuelles</div><h1>Voir les mathématiques <em>autrement.</em></h1><p>Des idées complexes rendues intuitives par l’animation, la géométrie et le code. Découvrez les mathématiques comme un paysage à explorer.</p><div className="hero-actions"><button className="cyan-btn" onClick={()=>go('videos')}><Play size={17} fill="currentColor"/> Voir les vidéos</button><button className="outline-btn" onClick={()=>go('apropos')}>Découvrir KobiPy</button></div></div>
        <div className="math-card"><div className="grid-lines"></div><svg viewBox="0 0 600 500"><defs><linearGradient id="curve"><stop stopColor="#dfab5d"/><stop offset="1" stopColor="#3dc7ca"/></linearGradient></defs><path d="M35 350 C115 350 140 140 220 140 C300 140 310 410 400 410 C475 410 500 220 575 220" fill="none" stroke="url(#curve)" strokeWidth="8" strokeLinecap="round"/><circle cx="220" cy="140" r="9" fill="#dfab5d"/><circle cx="400" cy="410" r="11" fill="#3dc7ca"/></svg><div className="math-caption"><small>VISUALISER POUR COMPRENDRE</small><strong>Analyse • Géométrie • Informatique</strong></div></div>
      </div></section>

      <section id="derniere-video" className="latest-video"><div className="latest-video-inner">
        <div className="latest-copy"><span className="kicker">DERNIÈRE VIDÉO PUBLIÉE</span><h2>{latestVideo.title}</h2><p>{latestVideo.description}</p><div className="latest-meta">{latestVideo.category} · {latestVideo.date} · {latestVideo.duration}</div><button className="cyan-btn" onClick={()=>setActiveVideo(latestVideo)}><Play size={17} fill="currentColor"/> Regarder la vidéo</button></div>
        <button className="latest-thumb" onClick={()=>setActiveVideo(latestVideo)} aria-label={`Lire ${latestVideo.title}`}><img src={`https://img.youtube.com/vi/${latestVideo.id}/maxresdefault.jpg`} alt=""/><span className="latest-play"><Play size={30} fill="currentColor"/></span></button>
      </div></section>
      <section id="stats" className="stats">{[['10,6 k+','abonnés'],['26','vidéos'],['413 k+','vues cumulées'],['15,9 k','vues moyennes / vidéo']].map(([n,l])=><div key={l}><strong>{n}</strong><span>{l}</span></div>)}</section>

      <section id="videos" className="section videos"><div className="section-head"><div><span className="kicker">LA VIDÉOTHÈQUE</span><h2>Explorer les leçons</h2><p>Une bibliothèque de concepts expliqués par l’image, classés par thème.</p></div><label className="search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher une vidéo"/></label></div>
        <div className="filters">{categories.map(c=><button className={c===category?'active':''} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div>
        <div className="video-grid">{filtered.map(v=><article className="video-card" key={v.id}><button className="thumb" onClick={()=>setActiveVideo(v)} aria-label={`Lire ${v.title}`}><img src={`https://img.youtube.com/vi/${v.id}/hqdefault.jpg`} alt=""/><span className="play"><Play fill="currentColor"/></span><small>{v.duration}</small></button><div className="video-body"><div className="meta">{v.category} · {v.date}</div><h3>{v.title}</h3><p>{v.description}</p><footer><span>{v.views}</span><ExternalLink size={17}/></footer></div></article>)}</div>
        <div className="center"><a className="outline-dark" href={`${CHANNEL_URL}/videos`} target="_blank">Toutes les vidéos sur YouTube <ExternalLink size={16}/></a></div>
      </section>

      <section id="apropos" className="about"><div className="section about-grid"><div className="quote"><span>π</span><blockquote>« L’intuition n’est pas l’opposé de la rigueur. Elle en est souvent la porte d’entrée. »</blockquote><small>— L’approche KobiPy</small></div><div><span className="kicker">À PROPOS DE LA CHAÎNE</span><h2>Donner une forme aux idées abstraites.</h2><p className="lead">KobiPy est une chaîne dédiée aux mathématiques et à l’informatique, avec un accent particulier sur l’animation et la visualisation.</p><p>Les vidéos mêlent vulgarisation, divertissement et notions du supérieur. Python, Manim, Pygame et Blender deviennent ici des instruments pour rendre visibles les mécanismes cachés derrière les formules.</p><div className="principles">{[['01','Comprendre'],['02','Visualiser'],['03','Approfondir'],['04','Partager']].map(([n,t])=><div key={n}><small>{n}</small><strong>{t}</strong></div>)}</div></div></div></section>

      <section className="support"><div><span>SOUTENIR LA CRÉATION</span><h2>Aidez KobiPy à faire bouger les mathématiques.</h2><p>Votre soutien finance le temps de recherche, d’écriture et d’animation nécessaire à chaque nouvelle vidéo.</p></div><a className="gold-btn large" href={TIPEEE_URL} target="_blank"><Heart/> Soutenir sur Tipeee</a></section>

      <section id="contact" className="contact-section"><div className="section contact-grid"><div className="contact-copy"><span className="kicker">PRENDRE CONTACT</span><h2>Une question, une collaboration ou une idée de vidéo ?</h2><p>Écrivez directement à KobiPy. Le formulaire prépare un message dans votre application de messagerie, sans stocker vos données sur le site.</p><div className="contact-direct"><Mail size={20}/><div><small>Adresse de contact</small><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></div></div></div><form className="contact-form" onSubmit={sendContact}><div className="form-row"><label>Nom<input required value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})} placeholder="Votre nom"/></label><label>E-mail<input required type="email" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} placeholder="vous@exemple.fr"/></label></div><label>Objet<input value={contact.subject} onChange={e=>setContact({...contact,subject:e.target.value})} placeholder="Objet de votre message"/></label><label>Message<textarea required rows="6" value={contact.message} onChange={e=>setContact({...contact,message:e.target.value})} placeholder="Votre message..."/></label><button className="cyan-btn" type="submit"><Send size={17}/> Préparer le message</button></form></div></section>
      <section id="faq" className="section faq"><div className="center"><span className="kicker">QUESTIONS FRÉQUENTES</span><h2>FAQ</h2></div><div className="faq-list">{faqs.map(([q,a],i)=><div key={q}><button onClick={()=>setOpenFaq(openFaq===i?-1:i)}><strong>{q}</strong><ChevronDown className={openFaq===i?'rotate':''}/></button>{openFaq===i&&<p>{a}</p>}</div>)}</div></section>
    </main>
    {activeVideo&&<div className="video-modal" role="dialog" aria-modal="true" aria-label={activeVideo.title} onClick={()=>setActiveVideo(null)}><div className="video-dialog" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setActiveVideo(null)} aria-label="Fermer"><X/></button><div className="iframe-wrap"><iframe src={`https://www.youtube-nocookie.com/embed/${activeVideo.id}?autoplay=1&rel=0`} title={activeVideo.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe></div><div className="modal-info"><span>{activeVideo.category}</span><h3>{activeVideo.title}</h3></div></div></div>}
    <footer className="footer"><div className="brand inverse"><img className="brand-logo" src="https://unavatar.io/youtube/kobipy" alt="Logo KobiPy"/><span><strong>KobiPy</strong><small>Mathématiques en mouvement</small></span></div><div><a href={CHANNEL_URL} target="_blank">YouTube</a><a href={TIPEEE_URL} target="_blank">Tipeee</a><button onClick={()=>go('faq')}>FAQ</button></div><small>Prototype éditorial — données publiques indicatives</small></footer>
  </div>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
