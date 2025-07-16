document.addEventListener('DOMContentLoaded', () => {
    // L'URL de votre nouvelle fonction backend Vercel.
    const BACKEND_API_URL = 'https://agenda-good.vercel.app/api/events';

    let events = []; // Cet array sera rempli par les données du backend

    const eventsListDiv = document.getElementById('events-list');
    const dateFilter = document.getElementById('date-filter');
    const cityFilter = document.getElementById('city-filter');
    const typeFilter = document.getElementById('type-filter');

    // Fonction pour afficher les événements
    async function displayEvents(filteredEvents) {
        eventsListDiv.innerHTML = ''; // Vide la liste actuelle

        if (filteredEvents.length === 0) {
            eventsListDiv.innerHTML = '<p class="no-events-message">Aucun événement ne correspond à vos critères de recherche.</p>';
            return;
        }

        const fragment = document.createDocumentFragment();

        for (const event of filteredEvents) {
            // Création du conteneur principal pour l'effet de retournement
            const eventCardContainer = document.createElement('div');
            eventCardContainer.classList.add('event-card-container');

            // La carte qui va être retournée
            const eventCard = document.createElement('div');
            eventCard.classList.add('event-card');
            eventCard.dataset.eventId = event.id; // Pour identifier la carte lors du clic

            // --- Face Avant de la carte (event-card-front) ---
            const eventCardFront = document.createElement('div');
            eventCardFront.classList.add('event-card-front');

            // Formatage de la date pour le carré à gauche
            const dateParts = event.date.split('/');
            const formattedDateForDisplay = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : event.date;
            const eventDate = new Date(formattedDateForDisplay);

            if (isNaN(eventDate.getTime())) {
                console.warn(`Date non valide pour l'événement "${event.name}": ${event.date}.`);
                continue;
            }

            const month = eventDate.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase();
            const day = eventDate.getDate();

            // Structure de la face avant de la carte
            eventCardFront.innerHTML = `
                ${event.imageUrl ? `<div class="event-image-container"><img src="${event.imageUrl}" alt="${event.name}"></div>` : ''}
                <div class="event-header">
                    <div class="event-date-box">
                        <span class="month">${month}</span>
                        <span class="day">${day}</span>
                    </div>
                    <div class="event-main-info">
                        <h2>${event.name}</h2>
                        <div class="event-meta-info">
                            <span class="type">${event.type}</span>
                            <span class="separator">|</span>
                            <span>${event.location}, ${event.city}</span>
                        </div>
                    </div>
                </div>
                <div class="event-actions">
                    <a href="${event.link}" target="_blank" class="event-link reserve-btn">Réserver</a>
                    ${event.description && event.description.trim() !== '' ? `<button class="toggle-description-btn" data-event-id="${event.id}">Plus d'infos</button>` : ''}
                </div>
            `;
            eventCard.appendChild(eventCardFront);

            // --- Face Arrière de la carte (event-card-back) ---
            const eventCardBack = document.createElement('div');
            eventCardBack.classList.add('event-card-back');
            eventCardBack.innerHTML = `
                <div class="event-description-content">
                    <h3>Description de l'événement</h3>
                    <p>${event.description || 'Aucune description disponible.'}</p>
                </div>
                <button class="toggle-description-btn back-btn" data-event-id="${event.id}">Retour</button>
            `;
            eventCard.appendChild(eventCardBack);

            // Ajout de la carte (avec ses deux faces) au conteneur
            eventCardContainer.appendChild(eventCard);
            fragment.appendChild(eventCardContainer);

            // --- NOUVEAU CODE : Écouteur de clic sur la carte entière ---
            eventCard.addEventListener('click', (e) => {
                // Si l'élément cliqué est un bouton ou un lien à l'intérieur de la carte,
                // on arrête la propagation pour ne pas déclencher le retournement de la carte
                // ET l'action du bouton/lien en même temps.
                if (e.target.closest('.toggle-description-btn') || e.target.closest('.event-link')) {
                    return; // Ne fait rien si on a cliqué sur un bouton ou un lien
                }
                // CORRECTION ICI : Utilisez e.currentTarget pour faire référence à l'élément eventCard
                e.currentTarget.classList.toggle('flipped');
            });
            // --- FIN NOUVEAU CODE ---

        }
        eventsListDiv.appendChild(fragment);

        // Ajout des écouteurs d'événements pour les boutons de retournement (qui restent, mais appellent stopPropagation)
        document.querySelectorAll('.toggle-description-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Empêche le clic sur le bouton de déclencher aussi le clic sur la carte
                const eventId = e.target.dataset.eventId;
                const card = document.querySelector(`.event-card[data-event-id="${eventId}"]`);
                if (card) {
                    card.classList.toggle('flipped');
                }
            });
        });

        // --- NOUVEAU CODE : Empêche le bouton Réserver de retourner la carte ---
        document.querySelectorAll('.event-link.reserve-btn').forEach(link => {
            link.addEventListener('click', (e) => {
                e.stopPropagation(); // Empêche le clic sur le lien de déclencher aussi le clic sur la carte
            });
        });
        // --- FIN NOUVEAU CODE ---
    }

    // Fonction pour peupler les filtres de ville et de type
    function populateFilters() {
        const cities = [...new Set(events.map(event => event.city))].sort();
        cityFilter.innerHTML = '<option value="">Toutes les villes</option>';
        cities.forEach(city => {
            if (city && city.trim() !== '') {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                cityFilter.appendChild(option);
            }
        });

        const types = [...new Set(events.map(event => event.type))].sort();
        typeFilter.innerHTML = '<option value="">Tous les types</option>';
        types.forEach(type => {
            if (type && type.trim() !== '') {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                typeFilter.appendChild(option);
            }
        });
    }

    // Fonction pour filtrer les événements
    function filterEvents() {
        const selectedDateStr = dateFilter.value; // Ceci sera au format YYYY-MM-DD ou vide
        const selectedCity = cityFilter.value;
        const selectedType = typeFilter.value;

        let selectedDateObj = null;
        if (selectedDateStr) {
            selectedDateObj = new Date(selectedDateStr);
            selectedDateObj.setHours(0, 0, 0, 0);
        }

        const filtered = events.filter(event => {
            let matchesDate = true;
            if (selectedDateObj) {
                const eventDateParts = event.date.split('/');
                let eventDateObj = null;
                if (eventDateParts.length === 3) {
                    eventDateObj = new Date(
                        parseInt(eventDateParts[2]),
                        parseInt(eventDateParts[1]) - 1,
                        parseInt(eventDateParts[0])
                    );
                    eventDateObj.setHours(0, 0, 0, 0);
                } else {
                    eventDateObj = new Date(event.date); // Tentez une conversion directe si déjà bon format
                    eventDateObj.setHours(0, 0, 0, 0);
                }

                if (eventDateObj && !isNaN(eventDateObj.getTime())) {
                    matchesDate = eventDateObj.getTime() === selectedDateObj.getTime();
                } else {
                    matchesDate = false;
                }
            }

            const matchesCity = selectedCity ? event.city === selectedCity : true;
            const matchesType = selectedType ? event.type === selectedType : true;

            return matchesDate && matchesCity && matchesType;
        });

        displayEvents(filtered);
    }

    // Fonction pour récupérer les événements depuis le backend Vercel
    async function getEventsFromBackend() {
        try {
            const response = await fetch(BACKEND_API_URL);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}. Détails: ${errorData.error || 'Aucun détail d\'erreur.'}`);
            }
            const eventsFromBackend = await response.json();

            // Mapping des données (correspond aux clés renvoyées par le backend)
            const mappedEvents = eventsFromBackend.map(row => {
                return {
                    id: row.id,
                    date: row.date,
                    name: row.name,
                    location: row.location,
                    city: row.city,
                    type: row.type,
                    link: row.link,
                    description: row.description || '',
                    imageUrl: row.imageUrl || '' // Assurez-vous que votre backend renvoie une 'imageUrl' si vous l'utilisez
                };
            });

            events.length = 0;
            events.push(...mappedEvents);

            populateFilters();
            filterEvents();
            console.log('Événements récupérés du backend Vercel et mis à jour:', events);

        } catch (err) {
            console.error('Erreur lors de la récupération des événements du backend:', err);
            eventsListDiv.innerHTML = `<p class="no-events-message">Impossible de charger les événements. Erreur : ${err.message}. Vérifiez la console pour plus de détails.</p>`;
        }
    }

    // Ajout des écouteurs d'événements pour les filtres
    dateFilter.addEventListener('change', filterEvents);
    cityFilter.addEventListener('change', filterEvents);
    typeFilter.addEventListener('change', filterEvents);

    // Initialisation
    getEventsFromBackend();
});
