// ============================================================
// PRODUITS
// ============================================================

let produits = [];


// ============================================================
// PANIER
// ============================================================

let panier = [];


// ============================================================
// PERSONNALISATION
// ============================================================

let personnalisation = {
    nomSite: "Plika",
    titreAccueil: "Bienvenue",
    texteAccueil: "Bonjour"
};

async function chargerPersonnalisation() {

    try {

        const reponse = await fetch(
            "/api/site-settings",
            {
                cache: "no-store"
            }
        );

        if (!reponse.ok) {
            throw new Error("Impossible de charger la personnalisation.");
        }

        personnalisation = await reponse.json();

        localStorage.setItem(
            "personnalisation",
            JSON.stringify(personnalisation)
        );

        afficherPersonnalisation();

    } catch (erreur) {

        console.error(
            "❌ Erreur personnalisation :",
            erreur
        );

        // Secours avec les anciennes données locales
        const locale = localStorage.getItem(
            "personnalisation"
        );

        if (locale) {
            try {
                personnalisation = JSON.parse(locale);
            } catch {
                // On garde les valeurs par défaut
            }
        }

        afficherPersonnalisation();
    }
}

// ============================================================
// CHARGER LE PANIER
// ============================================================

function chargerPanier() {

    try {

        const donnees =
            localStorage.getItem(
                "panier"
            );


        if (donnees) {

            const panierSauvegarde =
                JSON.parse(
                    donnees
                );


            if (
                Array.isArray(
                    panierSauvegarde
                )
            ) {

                panier =
                    panierSauvegarde;

            } else {

                panier = [];

            }

        } else {

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


// ============================================================
// SAUVEGARDER LE PANIER
// ============================================================

function sauvegarderPanier() {

    try {

        localStorage.setItem(
            "panier",
            JSON.stringify(
                panier
            )
        );

    } catch (erreur) {

        console.error(
            "Erreur sauvegarde panier :",
            erreur
        );

    }

}


// ============================================================
// CHARGER LES PRODUITS DU SERVEUR
// ============================================================

async function chargerProduits() {

    try {

        const reponse =
            await fetch(
                "/api/products"
            );


        if (!reponse.ok) {

            throw new Error(
                "Impossible de charger les produits."
            );

        }


        const donnees =
            await reponse.json();


        if (
            !Array.isArray(
                donnees
            )
        ) {

            throw new Error(
                "Les produits reçus sont invalides."
            );

        }


        produits =
            donnees;


        localStorage.setItem(
            "produits",
            JSON.stringify(
                produits
            )
        );


        afficherBoutique();

        afficherProduitDetail();

        mettreAJourPanier();


    } catch (erreur) {

        console.error(
            "Erreur chargement produits :",
            erreur
        );


        // Secours avec les données locales

        try {

            const locaux =
                JSON.parse(
                    localStorage.getItem(
                        "produits"
                    )
                );


            if (
                Array.isArray(
                    locaux
                )
            ) {

                produits =
                    locaux;

            }

        } catch {

            produits = [];

        }


        afficherBoutique();

        afficherProduitDetail();

        mettreAJourPanier();

    }

}


// ============================================================
// PERSONNALISATION
// ============================================================

function afficherPersonnalisation() {

    const logos =
        document.querySelectorAll(
            ".logo"
        );


    logos.forEach(
        logo => {

            logo.textContent =
                personnalisation.nomSite;

        }
    );


    const titre =
        document.querySelector(
            ".hero h1"
        );


    if (titre) {

        titre.innerHTML =
            echapperHTML(
                personnalisation.titreAccueil
            )
            .replace(
                /\n/g,
                "<br>"
            );

    }


    const texte =
        document.querySelector(
            ".hero p"
        );


    if (texte) {

        texte.textContent =
            personnalisation.texteAccueil;

    }

}


// ============================================================
// AFFICHER LA BOUTIQUE
// ============================================================

function afficherBoutique() {

    const liste =
        document.getElementById(
            "liste-boutique"
        );


    if (!liste) {

        return;

    }


    liste.innerHTML = "";


    if (
        produits.length === 0
    ) {

        liste.innerHTML = `
            <p>
                Aucun produit disponible.
            </p>
        `;

        return;

    }


    produits.forEach(
        (
            produit,
            index
        ) => {


            // =========================
            // IMAGE
            // =========================

            let image =
                "https://placehold.co/500x500?text=" +
                encodeURIComponent(
                    produit.nom
                );


            if (
                Array.isArray(
                    produit.images
                ) &&
                produit.images.length > 0
            ) {

                image =
                    produit.images[0];

            }


            // =========================
            // STOCK
            // =========================

            const stock =
                Number(
                    produit.stock
                );


            // =========================
            // AFFICHAGE PRODUIT
            // =========================

            liste.innerHTML += `

                <div
                    class="produit"
                    onclick="ouvrirProduit(${index})"
                >

                    <!-- PHOTO -->

                    <img
                        src="${image}"
                        alt="${echapperHTML(
                            produit.nom
                        )}"
                    >


                    <!-- INFORMATIONS -->

                    <div class="infos-carte">

                        <h3>

                            ${echapperHTML(
                                produit.nom
                            )}

                        </h3>


                        <p>

                            ${echapperHTML(
                                produit.description || ""
                            )}

                        </p>


                        <strong>

                            ${Number(
                                produit.prix
                            ).toFixed(2)} €

                        </strong>


                        <p class="stock">

                            ${
                                stock > 0

                                    ? "Stock : " + stock

                                    : "Épuisé"
                            }

                        </p>

                    </div>

                </div>

            `;

        }
    );

}


// ============================================================
// OUVRIR UN PRODUIT
// ============================================================

function ouvrirProduit(index) {

    const produit =
        produits[index];


    if (!produit) {

        return;

    }


    localStorage.setItem(
        "produitSelectionne",
        produit.id
    );


    window.location.href =
        "/produit.html";

}


// ============================================================
// AFFICHER LE DÉTAIL D'UN PRODUIT
// ============================================================

function afficherProduitDetail() {

    const detail =
        document.getElementById(
            "detail-produit"
        );


    if (!detail) {

        return;

    }


    const produitId =
        localStorage.getItem(
            "produitSelectionne"
        );


    if (!produitId) {

        return;

    }


    const produit =
        produits.find(
            p =>
                p.id === produitId
        );


    if (!produit) {

        detail.innerHTML = `
            <h1>
                Produit introuvable
            </h1>
        `;

        return;

    }


    let images =
        Array.isArray(
            produit.images
        )
            ? produit.images
            : [];


    if (
        images.length === 0
    ) {

        images = [

            "https://placehold.co/700x700?text=" +
            encodeURIComponent(
                produit.nom
            )

        ];

    }


    const stock =
        Number(
            produit.stock
        );


    detail.innerHTML = `

        <div
            class="galerie-produit"
        >

            <img
                id="photo-principale"
                class="photo-principale"
                src="${images[0]}"
                alt="${echapperHTML(
                    produit.nom
                )}"
            >


            <div
                class="miniatures"
            >

                ${
                    images
                        .map(
                            (
                                image,
                                index
                            ) => `

                                <img
                                    src="${image}"
                                    alt="${echapperHTML(
                                        produit.nom
                                    )}"
                                    class="miniature"
                                    onclick="changerPhoto(${index})"
                                >

                            `
                        )
                        .join("")
                }

            </div>

        </div>


        <div
            class="infos-produit"
        >

            <h1>

                ${echapperHTML(
                    produit.nom
                )}

            </h1>


            <div
                class="prix-produit"
            >

                ${Number(
                    produit.prix
                ).toFixed(2)}

                €

            </div>


            <p
                class="description-produit"
            >

                ${echapperHTML(
                    produit.description || ""
                )}

            </p>


            <p
                class="stock-produit"
            >

                ${
                    stock > 0

                        ? "Stock disponible : " + stock

                        : "Produit épuisé"
                }

            </p>


            ${
                stock > 0

                    ? `

                        <button
                            class="gros-bouton"
                            onclick="ajouterAuPanier('${produit.id}')"
                        >

                            Ajouter au panier

                        </button>

                    `

                    : `

                        <button
                            class="gros-bouton"
                            disabled
                        >

                            Épuisé

                        </button>

                    `
            }

        </div>

    `;

}


// ============================================================
// CHANGER DE PHOTO
// ============================================================

function changerPhoto(index) {

    const produitId =
        localStorage.getItem(
            "produitSelectionne"
        );


    const produit =
        produits.find(
            p =>
                p.id === produitId
        );


    if (
        !produit ||
        !Array.isArray(
            produit.images
        )
    ) {

        return;

    }


    if (
        !produit.images[index]
    ) {

        return;

    }


    const photo =
        document.getElementById(
            "photo-principale"
        );


    if (photo) {

        photo.src =
            produit.images[index];

    }

}


// ============================================================
// AJOUTER AU PANIER
// ============================================================

function ajouterAuPanier(
    produitId
) {

    const produit =
        produits.find(
            p =>
                p.id === produitId
        );


    if (!produit) {

        alert(
            "Produit introuvable."
        );

        return;

    }


    const stock =
        Number(
            produit.stock
        );


    if (
        stock <= 0
    ) {

        alert(
            "Ce produit est épuisé."
        );

        return;

    }


    const article =
        panier.find(
            p =>
                p.id === produit.id
        );


    if (article) {

        const nouvelleQuantite =
            Number(
                article.quantite
            ) + 1;


        if (
            nouvelleQuantite >
            stock
        ) {

            alert(
                "Il n'y a pas assez de stock."
            );

            return;

        }


        article.quantite =
            nouvelleQuantite;


    } else {

        panier.push({

            id:
                produit.id,

            nom:
                produit.nom,

            prix:
                Number(
                    produit.prix
                ),

            quantite:
                1

        });

    }


    sauvegarderPanier();

    mettreAJourPanier();


    console.log(
        "✅ Produit ajouté au panier :",
        produit.nom
    );

}


// ============================================================
// AFFICHER LE PANIER
// ============================================================

function mettreAJourPanier() {

    const contenu =
        document.getElementById(
            "contenu-panier"
        );


    const nombre =
        document.getElementById(
            "nombre-panier"
        );


    const totalElement =
        document.getElementById(
            "total"
        );


    sauvegarderPanier();


    if (!contenu) {

        return;

    }


    contenu.innerHTML = "";


    let total =
        0;


    let nombreArticles =
        0;


    panier.forEach(
        (
            article,
            index
        ) => {


            const quantite =
                Number(
                    article.quantite || 1
                );


            const prix =
                Number(
                    article.prix || 0
                );


            total +=
                prix *
                quantite;


            nombreArticles +=
                quantite;


            contenu.innerHTML += `

                <div
                    class="article-panier"
                >

                    <span>

                        ${echapperHTML(
                            article.nom
                        )}

                        ${
                            quantite > 1

                                ? " × " + quantite

                                : ""
                        }

                    </span>


                    <span>

                        ${
                            (
                                prix *
                                quantite
                            ).toFixed(2)
                        }

                        €

                        <button
                            type="button"
                            onclick="supprimerProduit(${index})"
                        >

                            ✕

                        </button>

                    </span>

                </div>

            `;

        }
    );


    if (
        panier.length === 0
    ) {

        contenu.innerHTML = `

            <p>

                Votre panier est vide.

            </p>

        `;

    }


    if (nombre) {

        nombre.textContent =
            nombreArticles;

    }


    if (totalElement) {

        totalElement.textContent =
            total.toFixed(2);

    }

}


// ============================================================
// SUPPRIMER DU PANIER
// ============================================================

function supprimerProduit(
    index
) {

    if (
        !panier[index]
    ) {

        return;

    }


    panier.splice(
        index,
        1
    );


    sauvegarderPanier();

    mettreAJourPanier();

}


// ============================================================
// OUVRIR LE PANIER
// ============================================================

function ouvrirPanier() {

    const fond =
        document.getElementById(
            "fond-panier"
        );


    if (fond) {

        fond.style.display =
            "block";

    }


    mettreAJourPanier();

}


// ============================================================
// FERMER LE PANIER
// ============================================================

function fermerPanier() {

    const fond =
        document.getElementById(
            "fond-panier"
        );


    if (fond) {

        fond.style.display =
            "none";

    }

}


// ============================================================
// PASSER COMMANDE
// ============================================================

function commander() {

    if (
        panier.length === 0
    ) {

        alert(
            "Votre panier est vide."
        );

        return;

    }


    sauvegarderPanier();


    window.location.href =
        "/livraison.html";

}


// ============================================================
// VIDER LE PANIER
// ============================================================

function viderPanier() {

    if (
        panier.length === 0
    ) {

        return;

    }


    const confirmation =
        confirm(
            "Voulez-vous vider votre panier ?"
        );


    if (
        !confirmation
    ) {

        return;

    }


    panier = [];


    sauvegarderPanier();

    mettreAJourPanier();

}


// ============================================================
// ÉCHAPPER LE HTML
// ============================================================

function echapperHTML(
    texte
) {

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


// ============================================================
// DÉMARRAGE
// ============================================================

chargerPersonnalisation();

chargerPanier();

mettreAJourPanier();

chargerProduits();