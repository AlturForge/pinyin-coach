# 拼音教练 Pinyin Coach

Entraînement interactif de la prononciation du chinois mandarin, axé sur les
**consonnes du pinyin** (s/sh, x/sh, j/zh, q/ch, z/zh, c/ch, n/l, r/l, f/h…) et
sur les **quatre tons**, avec un mode **Parler & se faire corriger (IA)**.

## Comment ça marche

1. Choisissez une série (Consonnes ou Tons).
2. Écoutez le modèle (synthèse vocale zh-CN), puis cliquez sur **Enregistrer**
   et lisez la phrase.
3. L'application analyse votre voix **entièrement dans le navigateur** :
   - **Consonnes** : la fricative est localisée dans le signal, son spectre est
     décomposé en bandes de fréquences (grave / moyen / aigu). Le sifflant
     *s* concentre son énergie au-dessus de 5,5 kHz, la palatale *x* autour de
     3,5–5,5 kHz, la rétroflexe *sh* plus bas ; l'application vous dit vers
     quel son votre prononciation penche réellement.
   - **Tons** : la mélodie de votre voix (F0) est suivie syllabe par syllabe,
     normalisée, puis comparée aux contours cibles des quatre tons, avec un
     graphique de votre contour superposé au modèle.
4. Bonus (Chrome/Edge) : la reconnaissance vocale zh-CN affiche ce que le
   moteur a entendu, pour repérer les syllabes confondues.

Aucun audio ne quitte votre appareil : pas de serveur, pas de clé API, pas de coût.

## 🤖 Parler & se faire corriger (IA)

Deux façons de procéder, au choix :

- **Parler librement** : rien à écrire. Appuyez, parlez en chinois, arrêtez.
- **Viser une phrase** : écrivez la phrase visée (en caractères chinois **ou**
  en pinyin) si vous voulez une comparaison précise.

Dans les deux cas, l'enregistrement est converti en WAV 16 kHz dans le
navigateur, puis envoyé **directement à un modèle de chat audio Mistral**
(`voxtral-small-latest`, partie `input_audio`) : le modèle écoute votre voix,
transcrit ce qu'il entend (« Entendu : … ») et vous explique en français vos
erreurs de prononciation probables (consonnes confondues s/sh, j/zh, q/ch, n/l,
r/l, f/h, tons inexacts, syllabes déformées) avec des conseils articulatoires.

Ce mode nécessite **votre propre clé API Mistral** (console.mistral.ai → API
Keys → New key). La clé est stockée uniquement dans le localStorage de votre
navigateur ; les appels vont directement du navigateur à api.mistral.ai.
Contrairement au reste de l'application, l'audio est ici envoyé à l'API.

## Textes personnalisés

Sur la page d'accueil, ajoutez vos propres phrases, une par ligne :

```
我想学习 ; wǒ xiǎng xuéxí
她去学校 ; tā qù xuéxiào
```

Elles sont conservées dans votre navigateur (localStorage).

## Déploiement (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` publie le site à chaque push sur
`main`. Une seule manipulation sur GitHub :
**Settings → Pages → Source → GitHub Actions**, puis le site est disponible sur
`https://alturforge.github.io/pinyin-coach/`.

## Limites connues

- L'analyse spectrale distingue les classes articulatoires (dentale /
  palatale / rétroflexe) et les contours de tons ; c'est un coach, pas un
  laboratoire de phonétique. Un microphone externe de qualité améliore nettement
  les résultats.
- La reconnaissance vocale nécessite Chrome ou Edge et fonctionne mieux avec
  une connexion (elle utilise le service de reconnaissance du navigateur).
- Safari/Firefox : enregistrement et analyse des tons fonctionnent, la
  reconnaissance n'est pas disponible.
- Correction IA : le diagnostic repose sur l'écoute du modèle Voxtral ; une
  transcription correcte ne garantit pas une prononciation parfaite (les
  erreurs fines de ton ne sont pas toujours audibles).

## Licence

MIT © AlturForge

> Site en ligne : https://alturforge.github.io/pinyin-coach/
