# Vigilance — plateforme LCB-FT

Prototype fonctionnel avancé d'une plateforme de traitement des alertes de
screening LCB-FT (lutte contre le blanchiment de capitaux et le financement du
terrorisme), destinée aux filiales d'un groupe financier.

L'application couvre les trois dispositifs de screening : **sanctions**, **PEP**
(personnes politiquement exposées) et **RCA** (proches et associés d'une
personne listée).

## Démarrer

Prérequis : Node.js 20.19+, 22.12+ ou 24+.

```bash
npm install
npm start          # http://localhost:4200
```

```bash
npm run build      # build de production
npm test           # tests unitaires (Vitest)
```

## Déploiement

Chaque poussée sur `main` publie l'application sur GitHub Pages
(`.github/workflows/deploy.yml`).

Le site étant servi depuis un sous-chemin (`/<dépôt>/`), le workflow passe
`--base-href` au build : sans cela, les scripts et les feuilles de style
seraient demandés à la racine du domaine. GitHub Pages ne servant que des
fichiers statiques, une URL profonde comme `/alertes/a-traiter` n'existe pas
sur disque ; `index.html` est donc dupliqué en `404.html` pour que le routeur
Angular reprenne la main. L'accès direct à une telle URL répond avec un statut
404 — c'est le fonctionnement attendu de cette plateforme, et l'application
s'affiche normalement.

## Pile technique

- **Angular 21** — composants standalone, Signals, `computed()`, `effect()`
- **Détection de changement sans Zone.js** (`provideZonelessChangeDetection`)
- **Lazy loading** par fonctionnalité, liaison des paramètres de route aux `input()`
- **SCSS** avec un système de jetons de conception, thèmes sombre et clair
- **Aucune dépendance d'affichage externe** — icônes et graphiques en SVG natif

## Architecture

```
src/app/
├── core/                  Domaine, état et services transverses
│   ├── models/            Référentiel métier, alertes, parties, audit, droits
│   ├── data/              Jeu de données de démonstration
│   ├── auth/              Session, niveaux d'habilitation, permissions
│   ├── guards/            Gardes de route par permission
│   ├── interceptors/      Corrélation des requêtes
│   ├── services/          Thème, notifications
│   └── state/             AlertStore — source de vérité des alertes
├── layout/                Coquille applicative
│   ├── app-shell/         Grille, raccourcis clavier globaux
│   ├── sidebar/           Navigation rétractable
│   ├── header/            Contexte de filiale, recherche, profil
│   └── command-palette/   Recherche globale (Ctrl+K)
├── shared/                Design system
│   ├── ui/                Badges, avatars, score, graphiques, drawer, modale…
│   ├── pipes/             Formats français (dates, durées, montants)
│   └── util/              Aides d'affichage
└── features/
    ├── dashboard/         Indicateurs, volumétrie, alertes prioritaires
    ├── alerts/
    │   ├── inbox/         File d'investigation (et « Mes alertes »)
    │   ├── processed/     Registre des décisions, réouverture
    │   ├── investigation/ Poste de travail d'analyse
    │   └── components/    Aperçu d'alerte
    ├── reporting/         Pilotage du dispositif
    ├── administration/    Habilitations, filiales, paramétrage
    └── access-denied/
```

## Workflow métier

```
ALERTE GÉNÉRÉE → À TRAITER → NIVEAU 1
                                │
                 ┌──────────────┴──────────────┐
            HOMONYME                    ESCALADE N2
                 │                             │
              TRAITÉE                      NIVEAU 2
                                               │
                                   ┌───────────┴───────────┐
                              NEUTRALISER               AVÉRER
                                   └───────────┬───────────┘
                                            TRAITÉE
                                               │
                                          (réouverture
                                        sur élément nouveau)
```

Toute décision exige une motivation écrite d'au moins 20 caractères et un
écran de confirmation récapitulant la décision, son auteur, son rôle, sa date
et ses conséquences.

## Matrice des droits

| Action | Niveau 1 | Niveau 2 | Admin |
| --- | :---: | :---: | :---: |
| Consulter alerte, client, fiche, matching, historique | ● | ● | ● |
| Commenter, s'affecter une alerte | ● | ● | ● |
| Affecter à un autre analyste | | ● | ● |
| Clôturer en homonyme | ● | | ● |
| Escalader au niveau 2 | ● | | ● |
| Neutraliser une alerte | | ● | ● |
| Avérer une alerte | | ● | ● |
| Rouvrir une alerte traitée | | ● | ● |
| Exporter les données | | ● | ● |
| Gérer utilisateurs et paramétrage | | | ● |

> Les permissions du frontend pilotent uniquement l'affichage : elles masquent
> les actions non autorisées pour réduire le bruit et les erreurs de
> manipulation. **Elles ne constituent pas une couche de sécurité.** Dans un
> déploiement réel, chaque action doit être revalidée côté serveur, seul juge
> de l'habilitation effective.

## Traçabilité

Toutes les mutations passent par `AlertStore`, et chacune écrit son propre
événement d'audit : il n'existe aucun chemin permettant de modifier une alerte
sans laisser de trace. Le journal est traité comme un registre en écriture
seule — aucun écran n'expose de modification ou de suppression d'entrée.

Chaque événement porte son identifiant, son auteur, son rôle, son horodatage,
l'action, la valeur avant et après, et le commentaire associé.

## Raccourcis clavier

| Raccourci | Action |
| --- | --- |
| `Ctrl` + `K` | Recherche globale |
| `Ctrl` + `B` | Réduire ou déployer le menu |
| `?` | Afficher les raccourcis |
| `G` puis `D` / `A` / `M` / `T` / `R` | Naviguer entre les écrans |
| `J` / `K` | Alerte suivante / précédente dans la file |
| `A` | S'affecter l'alerte ouverte |
| `C` | Ajouter un commentaire |
| `D` | Atteindre le panneau de décision |

## Données de démonstration

Le jeu de données combine une dizaine d'alertes écrites à la main — cohérentes
de bout en bout, avec fiches fournisseur complètes, alias, inscriptions de
sanctions, commentaires et historiques — et un générateur déterministe qui
produit le volume nécessaire pour éprouver filtres, tri et pagination.

La bascule de compte (menu profil) permet de parcourir l'application sous
chaque niveau d'habilitation. L'utilisateur par défaut est Sophie Martin,
analyste de niveau 2.

## Portée du prototype

Il s'agit d'un prototype d'interface : les données sont simulées côté client et
persistées en mémoire pour la durée de la session. Aucun appel réseau réel
n'est effectué, aucune donnée n'est conservée après rechargement, hormis les
préférences de thème, de menu et de compte.
