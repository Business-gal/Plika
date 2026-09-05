// ============================================================
// VARIABLES
// ============================================================

let panier = [];

let modeLivraison =
    "domicile";

let pointRetrait = null;

let produitsServeur = [];


// ============================================================
// CHARGER LE PANIER
// ============================================================

function chargerPanier() {

    try {

        const sauvegarde =
            localStorage.getItem(
                "panier"
            );


        panier =
            sauvegarde
                ? JSON.parse(
                    sauvegarde
                )
                : [];


        if (
            !Array.isArray(panier)
        ) {

            panier = [];

        }

    } catch (erreur) {

        console.error(
            "Erreur panier :",
            erreur
        );

        panier = [];

    }

}


// ============================================================
// CHARGER LA LIVRAISON
// ============================================================

function chargerLivraison() {

    modeLivraison =
        localStorage.getItem(
            "modeLivraison"
        ) || "domicile";


    try {

        pointRetrait =
            JSON.parse(
                localStorage.getItem(
                    "pointRetrait"
                )
            );

    } catch {

        pointRetrait =
            null;

    }

}


// ============================================================
// CHARGER LES PRODUITS
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


        produitsServeur =
            await reponse.json();


        if (
            !Array.isArray(
                produitsServeur
            )
        ) {

            produitsServeur = [];

        }

    } catch (erreur) {

        console.error(
            erreur
        );

        // On continue avec les données
        // présentes dans le panier.

        produitsServeur = [];

    }

}


// ============================================================
// AFFICHER LA PAGE
// ============================================================

function afficherPage() {

    const contenu =
        document.getElementById(
            "contenu"
        );


    if (!contenu) {
        return;
    }


    if (
        panier.length === 0
    ) {

        contenu.innerHTML = `

            <div class="carte">

                <h2>
                    Votre panier est vide
                </h2>

                <p>
                    Retournez à la boutique pour ajouter des produits.
                </p>

                <a
                    href="/index.html"
                    class="retour"
                >
                    ← Retour à la boutique
                </a>

            </div>

        `;

        return;

    }


    // ========================================================
    // CALCUL
    // ========================================================

    let sousTotal = 0;

    let nombreArticles = 0;


    panier.forEach(
        article => {

            const quantite =
                Number(
                    article.quantite || 1
                );


            const prix =
                Number(
                    article.prix || 0
                );


            sousTotal +=
                prix * quantite;


            nombreArticles +=
                quantite;

        }
    );


    const prixLivraison =
        modeLivraison ===
            "retrait"
            ? 3
            : 5;


    const total =
        sousTotal +
        prixLivraison;


    // ========================================================
    // ARTICLES
    // ========================================================

    const articlesHTML =
        panier
            .map(
                article => {

                    const produit =
                        produitsServeur.find(
                            produit =>
                                produit.id ===
                                article.id
                        );


                    let image =
                        "https://placehold.co/150x150?text=" +
                        encodeURIComponent(
                            article.nom
                        );


                    if (
                        produit &&
                        Array.isArray(
                            produit.images
                        ) &&
                        produit.images.length > 0
                    ) {

                        image =
                            produit.images[0];

                    }


                    const quantite =
                        Number(
                            article.quantite || 1
                        );


                    const prix =
                        Number(
                            article.prix || 0
                        );


                    return `

                        <div class="article">

                            <img
                                class="article-image"
                                src="${image}"
                                alt="${echapperHTML(
                                    article.nom
                                )}"
                            >


                            <div class="article-info">

                                <div class="article-nom">

                                    ${echapperHTML(
                                        article.nom
                                    )}

                                </div>


                                <div class="article-quantite">

                                    Quantité :
                                    ${quantite}

                                </div>

                            </div>


                            <div class="article-prix">

                                ${formaterPrix(
                                    prix *
                                    quantite
                                )}

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    // ========================================================
    // LIVRAISON
    // ========================================================

    let livraisonHTML = "";


    if (
        modeLivraison ===
        "retrait"
    ) {

        if (
            !pointRetrait
        ) {

            afficherErreur(
                "Aucun point de retrait n'a été sélectionné."
            );

            return;

        }


        livraisonHTML = `

            <div class="livraison-box">

                <div class="livraison-titre">

                    📍 Point de retrait

                </div>


                <div class="livraison-type">

                    Livraison :
                    <strong>
                        3,00 €
                    </strong>

                </div>


                <div class="point">

                    <strong>
                        ${echapperHTML(
                            pointRetrait.nom
                        )}
                    </strong>


                    ${
                        pointRetrait.type
                            ? `
                                <p>
                                    ${echapperHTML(
                                        pointRetrait.type
                                    )}
                                </p>
                            `
                            : ""
                    }


                    <p>

                        ${echapperHTML(
                            pointRetrait.adresse
                        )}

                    </p>


                    ${
                        pointRetrait.complement
                            ? `
                                <p>
                                    ${echapperHTML(
                                        pointRetrait.complement
                                    )}
                                </p>
                            `
                            : ""
                    }


                    <p>

                        ${echapperHTML(
                            pointRetrait.codePostal
                        )}

                        ${echapperHTML(
                            pointRetrait.ville
                        )}

                    </p>

                </div>

            </div>

        `;

    } else {

        livraisonHTML = `

            <div class="livraison-box">

                <div class="livraison-titre">

                    🏠 Livraison à domicile

                </div>


                <div class="livraison-type">

                    Livraison :
                    <strong>
                        5,00 €
                    </strong>

                </div>


                <div class="adresse">

                    Votre adresse complète sera demandée
                    directement sur Stripe.

                </div>

            </div>

        `;

    }


    // ========================================================
    // AFFICHAGE FINAL
    // ========================================================

    contenu.innerHTML = `

        <div class="layout">


            <!-- ==============================================
                 COMMANDE
            =============================================== -->

            <div class="carte">

                <h2>
                    Votre commande
                </h2>


                <div class="articles">

                    ${articlesHTML}

                </div>


                <div class="livraison">

                    <h2>
                        Livraison
                    </h2>


                    ${livraisonHTML}

                </div>

            </div>


            <!-- ==============================================
                 TOTAL
            =============================================== -->

            <aside class="carte">


                <h2>
                    Total
                </h2>


                <div class="ligne">

                    <span>
                        ${nombreArticles}
                        article${
                            nombreArticles > 1
                                ? "s"
                                : ""
                        }
                    </span>


                    <strong>
                        ${formaterPrix(
                            sousTotal
                        )}
                    </strong>

                </div>


                <div class="ligne">

                    <span>
                        Livraison
                    </span>


                    <strong>
                        ${formaterPrix(
                            prixLivraison
                        )}
                    </strong>

                </div>


                <div class="ligne total">

                    <span>
                        Total
                    </span>


                    <strong>
                        ${formaterPrix(
                            total
                        )}
                    </strong>

                </div>


                <button
                    id="bouton-payer"
                    type="button"
                    class="payer"
                    onclick="lancerPaiement()"
                >
                    🔒 Continuer vers Stripe
                </button>


                <div class="securite">

                    🔒 Paiement sécurisé par Stripe<br>

                    Aucune donnée bancaire n'est
                    stockée sur notre site.

                </div>

            </aside>

        </div>

    `;

}


// ============================================================
// LANCER STRIPE
// ============================================================

async function lancerPaiement() {

    const bouton =
        document.getElementById(
            "bouton-payer"
        );


    if (
        panier.length === 0
    ) {

        afficherErreur(
            "Votre panier est vide."
        );

        return;

    }


    if (
        modeLivraison ===
            "retrait" &&
        !pointRetrait
    ) {

        afficherErreur(
            "Aucun point de retrait n'a été sélectionné."
        );

        return;

    }


    if (bouton) {

        bouton.disabled = true;

        bouton.textContent =
            "Redirection vers Stripe...";

    }


    const articles =
        panier.map(
            article => ({

                id:
                    article.id,

                quantite:
                    Number(
                        article.quantite ||
                        1
                    )

            })
        );


    const livraison = {

        mode:
            modeLivraison,

        pointRetrait:
            modeLivraison ===
                "retrait"
                ? pointRetrait
                : null

    };


    try {

        const reponse =
            await fetch(
                "/api/create-checkout-session",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            panier:
                                articles,

                            livraison:
                                livraison

                        })

                }
            );


        const resultat =
            await reponse.json();


        if (!reponse.ok) {

            throw new Error(
                resultat.erreur ||
                "Impossible de créer le paiement."
            );

        }


        if (
            !resultat.url
        ) {

            throw new Error(
                "Stripe n'a pas retourné de lien de paiement."
            );

        }


        window.location.href =
            resultat.url;


    } catch (erreur) {

        console.error(
            "❌ Erreur Stripe :",
            erreur
        );


        afficherErreur(
            erreur.message
        );


        if (bouton) {

            bouton.disabled =
                false;

            bouton.textContent =
                "🔒 Continuer vers Stripe";

        }

    }

}


// ============================================================
// ERREUR
// ============================================================

function afficherErreur(
    message
) {

    const element =
        document.getElementById(
            "message-erreur"
        );


    if (!element) {
        return;
    }


    element.textContent =
        message;


    element.style.display =
        "block";


    window.scrollTo({
        top:
            0,

        behavior:
            "smooth"
    });

}


// ============================================================
// FORMAT PRIX
// ============================================================

function formaterPrix(
    valeur
) {

    return (
        Number(
            valeur
        )
            .toFixed(2)
            .replace(
                ".",
                ","
            ) +
        " €"
    );

}


// ============================================================
// PROTECTION HTML
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

async function demarrer() {

    chargerPanier();

    chargerLivraison();

    await chargerProduits();

    afficherPage();

}


demarrer();