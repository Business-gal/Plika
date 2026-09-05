// ==================================================
// VARIABLES
// ==================================================

let panier = [];

let modeLivraison = "domicile";

let pointsRetrait = [];

let pointSelectionne = null;


// ==================================================
// TARIFS AFFICHÉS
// ==================================================

const PRIX_RETRAIT = 3;
const PRIX_DOMICILE = 5;


// ==================================================
// CHARGER LE PANIER
// ==================================================

function chargerPanier() {

    try {

        const sauvegarde =
            localStorage.getItem("panier");

        panier =
            sauvegarde
                ? JSON.parse(sauvegarde)
                : [];

        if (!Array.isArray(panier)) {
            panier = [];
        }

    } catch (erreur) {

        console.error(
            "Erreur chargement panier :",
            erreur
        );

        panier = [];
    }
}


// ==================================================
// AFFICHER LE RÉSUMÉ
// ==================================================

function afficherResume() {

    let sousTotal = 0;
    let nombreArticles = 0;

    panier.forEach(article => {

        const quantite =
            Number(article.quantite || 1);

        const prix =
            Number(article.prix || 0);

        sousTotal +=
            prix * quantite;

        nombreArticles +=
            quantite;
    });


    const prixLivraison =
        modeLivraison === "retrait"
            ? PRIX_RETRAIT
            : PRIX_DOMICILE;


    const total =
        sousTotal + prixLivraison;


    const nombre =
        document.getElementById(
            "nombre-articles"
        );

    const sousTotalElement =
        document.getElementById(
            "sous-total"
        );

    const livraisonElement =
        document.getElementById(
            "prix-livraison"
        );

    const totalElement =
        document.getElementById(
            "total-commande"
        );


    if (nombre) {
        nombre.textContent =
            nombreArticles;
    }

    if (sousTotalElement) {
        sousTotalElement.textContent =
            formaterPrix(sousTotal);
    }

    if (livraisonElement) {
        livraisonElement.textContent =
            formaterPrix(prixLivraison);
    }

    if (totalElement) {
        totalElement.textContent =
            formaterPrix(total);
    }
}


// ==================================================
// CHANGER LE MODE DE LIVRAISON
// ==================================================

function changerMode(mode) {

    modeLivraison = mode;

    pointSelectionne = null;
    pointsRetrait = [];


    const zoneRetrait =
        document.getElementById(
            "zone-retrait"
        );

    const zoneDomicile =
        document.getElementById(
            "zone-domicile"
        );

    const resultats =
        document.getElementById(
            "resultats-points"
        );

    const selection =
        document.getElementById(
            "point-selectionne"
        );


    if (mode === "retrait") {

        if (zoneRetrait) {
            zoneRetrait.style.display =
                "block";
        }

        if (zoneDomicile) {
            zoneDomicile.style.display =
                "none";
        }

    } else {

        if (zoneRetrait) {
            zoneRetrait.style.display =
                "none";
        }

        if (zoneDomicile) {
            zoneDomicile.style.display =
                "block";
        }
    }


    if (resultats) {
        resultats.innerHTML = "";
    }

    if (selection) {
        selection.innerHTML = "";
    }


    afficherResume();
}


// ==================================================
// RECHERCHER UN POINT
// ==================================================

async function rechercherPoints() {

    const champ =
        document.getElementById(
            "recherche-point"
        );

    const resultats =
        document.getElementById(
            "resultats-points"
        );


    if (!champ || !resultats) {
        return;
    }


    const recherche =
        champ.value.trim();


    if (!recherche) {

        resultats.innerHTML = `

            <div class="message">
                ❌ Entrez un code postal,
                une ville, un nom ou une adresse.
            </div>

        `;

        return;
    }


    resultats.innerHTML = `

        <div class="chargement">
            🔎 Recherche des points de retrait...
        </div>

    `;


    try {

        const params =
            new URLSearchParams({

                recherche:
                    recherche

            });


        const reponse =
            await fetch(
                "/api/rechercher-points?" +
                params.toString()
            );


        const donnees =
            await reponse.json();


        if (!reponse.ok) {

            throw new Error(
                donnees.erreur ||
                "Erreur lors de la recherche."
            );
        }


        pointsRetrait =
            Array.isArray(
                donnees.points
            )
                ? donnees.points
                : [];


        afficherPoints();


    } catch (erreur) {

        console.error(
            "❌ Erreur recherche point retrait :",
            erreur
        );


        resultats.innerHTML = `

            <div class="message">
                ❌ ${echapperHTML(
                    erreur.message
                )}
            </div>

        `;
    }
}


// ==================================================
// AFFICHER LES POINTS
// ==================================================

function afficherPoints() {

    const resultats =
        document.getElementById(
            "resultats-points"
        );


    if (!resultats) {
        return;
    }


    if (pointsRetrait.length === 0) {

        resultats.innerHTML = `

            <div class="message">

                Aucun point de retrait trouvé.

                <br><br>

                Essayez par exemple :
                <strong>87000</strong>,
                <strong>Limoges</strong>,
                <strong>Préfecture</strong>
                ou <strong>Fleurus</strong>.

            </div>

        `;

        return;
    }


    resultats.innerHTML =
        pointsRetrait
            .map(
                (
                    point,
                    index
                ) => {

                    return `

                        <div class="point">

                            <div class="point-info">

                                <div class="point-nom">

                                    ${echapperHTML(
                                        point.nom ||
                                        "Point de retrait"
                                    )}

                                </div>


                                ${
                                    point.type
                                        ? `
                                            <span class="point-type">

                                                ${echapperHTML(
                                                    point.type
                                                )}

                                            </span>
                                        `
                                        : ""
                                }


                                <p>

                                    ${echapperHTML(
                                        point.adresse ||
                                        ""
                                    )}

                                    ${
                                        point.complement
                                            ? ", " +
                                              echapperHTML(
                                                  point.complement
                                              )
                                            : ""
                                    }

                                </p>


                                <p>

                                    ${echapperHTML(
                                        point.codePostal ||
                                        ""
                                    )}

                                    ${
                                        point.ville
                                            ? " " +
                                              echapperHTML(
                                                  point.ville
                                              )
                                            : ""
                                    }

                                </p>

                            </div>


                            <button
                                type="button"
                                class="choisir"
                                onclick="selectionnerPoint(${index})"
                            >
                                Choisir
                            </button>

                        </div>

                    `;
                }
            )
            .join("");
}


// ==================================================
// SÉLECTIONNER UN POINT
// ==================================================

function selectionnerPoint(index) {

    const point =
        pointsRetrait[index];


    if (!point) {
        return;
    }


    pointSelectionne = {

        id:
            point.id || "",

        nom:
            point.nom || "",

        type:
            point.type || "",

        adresse:
            point.adresse || "",

        complement:
            point.complement || "",

        codePostal:
            point.codePostal || "",

        ville:
            point.ville || "",

        latitude:
            point.latitude ?? null,

        longitude:
            point.longitude ?? null

    };


    afficherPointSelectionne();
}


// ==================================================
// AFFICHER LE POINT SÉLECTIONNÉ
// ==================================================

function afficherPointSelectionne() {

    const resultats =
        document.getElementById(
            "resultats-points"
        );

    const selection =
        document.getElementById(
            "point-selectionne"
        );


    if (resultats) {
        resultats.innerHTML = "";
    }


    if (!selection) {
        return;
    }


    selection.innerHTML = `

        <div class="point-selectionne">

            <div class="ok">
                ✅ Point de retrait sélectionné
            </div>


            <strong>
                ${echapperHTML(
                    pointSelectionne.nom
                )}
            </strong>


            ${
                pointSelectionne.type
                    ? `
                        <p>
                            ${echapperHTML(
                                pointSelectionne.type
                            )}
                        </p>
                    `
                    : ""
            }


            <p>

                ${echapperHTML(
                    pointSelectionne.adresse
                )}

                ${
                    pointSelectionne.complement
                        ? ", " +
                          echapperHTML(
                              pointSelectionne.complement
                          )
                        : ""
                }

            </p>


            <p>

                ${echapperHTML(
                    pointSelectionne.codePostal
                )}

                ${echapperHTML(
                    pointSelectionne.ville
                )}

            </p>


            <button
                type="button"
                class="changer"
                onclick="changerPoint()"
            >
                Changer de point
            </button>

        </div>

    `;
}


// ==================================================
// CHANGER DE POINT
// ==================================================

function changerPoint() {

    pointSelectionne = null;

    pointsRetrait = [];


    const selection =
        document.getElementById(
            "point-selectionne"
        );

    const resultats =
        document.getElementById(
            "resultats-points"
        );


    if (selection) {
        selection.innerHTML = "";
    }

    if (resultats) {
        resultats.innerHTML = "";
    }


    const champ =
        document.getElementById(
            "recherche-point"
        );


    if (champ) {
        champ.focus();
    }
}


// ==================================================
// CONTINUER VERS LE PAIEMENT
// ==================================================

function continuerPaiement() {

    if (panier.length === 0) {

        alert(
            "Votre panier est vide."
        );

        return;
    }


    if (
        modeLivraison === "retrait" &&
        !pointSelectionne
    ) {

        alert(
            "Veuillez choisir un point de retrait."
        );

        return;
    }


    localStorage.setItem(
        "modeLivraison",
        modeLivraison
    );


    localStorage.setItem(
        "pointRetrait",
        JSON.stringify(
            pointSelectionne
        )
    );


    window.location.href =
        "/paiement.html";
}


// ==================================================
// PRIX
// ==================================================

function formaterPrix(valeur) {

    return (
        Number(valeur)
            .toFixed(2)
            .replace(".", ",") +
        " €"
    );
}


// ==================================================
// PROTECTION HTML
// ==================================================

function echapperHTML(texte) {

    return String(
        texte ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// ==================================================
// TOUCHE ENTRÉE POUR RECHERCHER
// ==================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const champ =
            document.getElementById(
                "recherche-point"
            );


        if (champ) {

            champ.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Enter"
                    ) {

                        event.preventDefault();

                        rechercherPoints();
                    }

                }
            );

        }

    }
);


// ==================================================
// DÉMARRAGE
// ==================================================

chargerPanier();

afficherResume();