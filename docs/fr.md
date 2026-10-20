# Ghostfolio

Retrouvez vos placements dans Gladys : le patrimoine, la performance du jour, de l'année et depuis le début,
la répartition par classe d'actifs et la valeur de chaque compte, lus dans votre propre
[Ghostfolio](https://ghostfol.io), le logiciel libre de suivi de patrimoine.

L'intégration ne fait que lire : elle n'écrit jamais dans Ghostfolio, ne crée jamais d'opération. Elle parle
directement à votre Ghostfolio sur votre réseau, avec le jeton de sécurité de votre utilisateur. Non affiliée à
Ghostfolio.

## Ce que vous obtenez

- Un **appareil portefeuille** : patrimoine total (liquidités comprises), valeur des positions, montant
  investi, et la variation du jour, depuis le 1er janvier et depuis le début, en montant et en pourcentage,
  avec leur historique.
- Un **appareil par compte** (courtier, banque, portefeuille crypto…) : sa valeur, ses liquidités et sa part
  du portefeuille.
- Un **widget de tableau de bord** : les chiffres du portefeuille, la répartition par classe d'actifs et les
  comptes ajoutés.
- Un **déclencheur de scène** : le patrimoine, ou la performance totale, atteint un plus haut historique.
- Une **action de scène** : lire le portefeuille, en une phrase à envoyer par message ou à faire lire à voix
  haute.
- Une variation du jour au-delà de ±N % passe par le déclencheur standard d'appareil de Gladys (voir les
  exemples de scènes).

Tous les montants sont dans la devise de base de votre utilisateur Ghostfolio : Ghostfolio convertit les
autres devises.

## Prérequis

- Gladys Assistant 5.1 ou plus récent.
- Un Ghostfolio récent (testé avec la 3.88.0), auto-hébergé et joignable depuis la machine de Gladys (même
  réseau, VPN ou adresse publique).
- Le jeton de sécurité de votre utilisateur Ghostfolio.

## Configuration

### Trouver le jeton de sécurité

Le jeton de sécurité est celui qui sert à vous connecter à Ghostfolio : Ghostfolio l'affiche une seule fois, à
la création du compte. Si vous ne l'avez pas gardé, ouvrez **Mon Ghostfolio → Paramètres** et générez-en un
nouveau (l'ancien cesse alors de fonctionner, y compris pour vous connecter). Un compte créé avec une
connexion Google ou OpenID peut aussi en générer un à cet endroit.

### Réglages

Dans Gladys, ouvrez **Intégrations → Ghostfolio → Configuration** :

- **Adresse de Ghostfolio** : l'adresse à laquelle vous ouvrez Ghostfolio, par exemple
  `http://192.168.1.20:3333`. Sans `http://`, il est ajouté.
- **Jeton de sécurité** : le jeton ci-dessus. Gladys le garde ; l'intégration ne l'écrit jamais dans ses
  journaux.
- **Accepter un certificat auto-signé** : seulement pour une adresse `https` dont vous avez fait le certificat
  vous-même.
- **Fréquence de mise à jour** : de 5 à 60 minutes, 15 par défaut. Ghostfolio met ses cours à jour lui-même.
- **Langue des textes** : les noms des fonctionnalités (donnés à l'ajout d'un appareil) et les phrases envoyées
  aux scènes. Français par défaut.

Enregistrez, puis **Tester la connexion** : le message donne le patrimoine, le nombre de comptes et la devise
de base. Ouvrez l'onglet **Découverte** et ajoutez le portefeuille et les comptes voulus : seuls les appareils
ajoutés sont suivis.

## Appareils

**Portefeuille** (nommé « Ghostfolio ») :

| Fonctionnalité                            | Ce que c'est                                                |
| ----------------------------------------- | ----------------------------------------------------------- |
| Patrimoine total                          | Valeur des positions plus les liquidités des comptes        |
| Valeur                                    | Valeur des positions                                        |
| Investi                                   | Montant investi (achats moins ventes)                       |
| Variation du jour / Variation du jour (%) | Performance nette du jour, frais et effet de change compris |
| Variation depuis le 1er janvier (et %)    | Performance nette depuis le 1er janvier                     |
| Performance totale (et %)                 | Performance nette depuis la première opération              |

**Compte** (nommé comme dans Ghostfolio) : **Valeur** (positions et liquidités du compte), **Liquidités**, et
**Part du portefeuille** en pourcentage.

Les chiffres sont ceux que Ghostfolio affiche avec l'effet de change. Renommer un compte dans Ghostfolio garde
son appareil.

## Widget de tableau de bord

Ajoutez le widget **Aperçu Ghostfolio** à un tableau de bord : patrimoine, investi, variation du jour, de
l'année et depuis le début (en vert pour un gain, en rouge pour une perte), puis la part de chaque classe
d'actifs (actions, obligations, liquidités…), et les comptes ajoutés avec leur valeur et leur part. Le pied
donne l'heure de la dernière lecture.

## Déclencheurs de scène

**Ghostfolio : plus haut historique**, avec la mesure à suivre :

- **Patrimoine total** : le patrimoine dépasse son plus haut. Un versement compte aussi.
- **Performance totale (%)** : la performance totale dépasse son plus haut ; les versements ne la font pas
  bouger.

Le plus haut vient du graphique de Ghostfolio à la première lecture du portefeuille, puis suit chaque nouveau
record. L'événement part au plus une fois par jour et par mesure, quelle que soit la durée de la hausse.
Variables : le nouveau plus haut, le précédent, l'unité (code de devise ou `%`) et une phrase toute faite.

## Actions de scène

**Ghostfolio : lire le portefeuille** répond par une phrase, par exemple « Portefeuille : 5 629,83 €.
Aujourd'hui +20,68 € (+0,54 %), depuis le 1er janvier +6,15 %, depuis le début +23,90 %. » Sorties : la phrase,
le patrimoine, la variation du jour (montant et pourcentage), la variation de l'année et la performance totale
en pourcentage. Ghostfolio est relu quand la dernière lecture date de plus d'une période de mise à jour.

## Exemples de scènes

- **Bilan du soir** : chaque jour à 18 h, « Ghostfolio : lire le portefeuille », puis envoyer la phrase par
  Telegram.
- **Gros mouvement** : déclencheur « Changement d'état de l'appareil » sur la fonctionnalité **Variation du
  jour (%)** du portefeuille, au-dessus de 3 (et une deuxième scène en dessous de -3), avec « Exécuter
  seulement lorsque le seuil est passé » : une notification quand les marchés bougent.
- **Fêter ça** : « Ghostfolio : plus haut historique » sur la performance totale, puis une lumière en vert et
  la phrase lue à voix haute.

## Confidentialité et données

- L'intégration lit `api/v1/user`, `api/v2/portfolio/performance` (périodes 1d, ytd et max),
  `api/v1/portfolio/details` et `api/v1/account`. Elle ne fait que se connecter avec le jeton de sécurité
  (`api/v1/auth/anonymous`) et n'écrit jamais dans Ghostfolio.
- Les journaux ne contiennent jamais de montant, de nom de compte, le jeton ni l'adresse du serveur, même au
  niveau debug.
- Sous `/data`, l'intégration garde l'identifiant de l'utilisateur Ghostfolio, les deux plus hauts et le jour du
  dernier événement, pour qu'un redémarrage ne déclenche rien deux fois.
- Vos valeurs restent entre Gladys et votre Ghostfolio : aucun service tiers.

## Dépannage

- **« Ghostfolio refuse le jeton de sécurité »** : le jeton a été renouvelé, ou mal recopié. Générez-en un
  nouveau dans Mon Ghostfolio → Paramètres et collez-le à nouveau.
- **« Ghostfolio ne répond pas »** : vérifiez l'adresse depuis la machine de Gladys
  (`curl http://…/api/v1/health` doit répondre `{"status":"OK"}`). Les dernières valeurs sont gardées.
- **« Cette adresse ne répond pas comme l'API de Ghostfolio »** : l'adresse mène ailleurs (une page de proxy,
  un autre port).
- **Les chiffres ne bougent pas** : Ghostfolio met ses cours à jour lui-même ; vérifiez sa propre page. La
  variation du jour reste à 0 marchés fermés.
- Plus de détails : réglez `LOG_LEVEL=debug` sur l'intégration et lisez ses journaux.

## Limites

- Lecture seule ; un seul utilisateur Ghostfolio (celui du jeton). Le cloud de Ghostfolio (ghostfol.io) devrait
  fonctionner avec son adresse, mais n'a pas été testé.
- Les chiffres suivent la mise à jour des cours et le cache de Ghostfolio : parfois quelques minutes de retard.
- Le graphique de Ghostfolio est échantillonné sur les longues périodes : un plus haut entre deux points peut
  échapper à la toute première lecture.
- Développée et testée contre un vrai Ghostfolio 3.88.0 en Docker, avec des comptes et des actifs fictifs, pas
  encore sur une installation Gladys avec un vrai portefeuille : vos retours sont les bienvenus.
- Non affiliée à Ghostfolio.
