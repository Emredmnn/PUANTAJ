// Global Durum Yönetimi ve Sistem Değişkenleri
let otomasyonVerisi = [];
let sistemLoglari = [];
let seciliPersonelId = null;
let seciliGun = null;
let mevcutYil = 2026;
let mevcutAy = 5; // Haziran (0-indexed tabanlı olduğu için 5 hazirana denk gelir)
let mevcutFiltre = "HEPSİ";

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("donemSecici").value = `2026-06`;
    saatiBaslat();
    donemDegisti();

    // Firebase'in tarayıcıda hazır hale gelmesini bekleyen güvenli tetikleyici döngü
    const bulutBaglantiKontrol = setInterval(() => {
        if (window.db && window.firebaseRef && window.firebaseOnValue) {
            clearInterval(bulutBaglantiKontrol);
            
            // Personel Verilerini Dinleme
            const puantajRef = window.firebaseRef(window.db, 'puantaj');
            window.firebaseOnValue(puantajRef, (snapshot) => {
                const data = snapshot.val();
                otomasyonVerisi = data ? Object.values(data) : [];
                tabloyuCiz();
            });

            // Log Değişim Geçmişini Dinleme
            const logRef = window.firebaseRef(window.db, 'loglar');
            window.firebaseOnValue(logRef, (snapshot) => {
                const data = snapshot.val();
                sistemLoglari = data ? Object.values(data) : [];
            });
        }
    }, 300);
});

function saatiBaslat() {
    setInterval(() => {
        const simdi = new Date();
        document.getElementById("live-time").innerText = simdi.toLocaleTimeString('tr-TR');
        document.getElementById("live-date-day").innerText = simdi.getDate().toString().padStart(2, '0');
    }, 1000);
}

function donemDegisti() {
    const val = document.getElementById("donemSecici").value;
    if (!val) return;
    const parts = val.split("-");
    mevcutYil = parseInt(parts[0]);
    mevcutAy = parseInt(parts[1]) - 1;
    basliklariCiz();
    tabloyuCiz();
}

function ayinGunSayisi(yil, ay) { return new Date(yil, ay + 1, 0).getDate(); }

function basliklariCiz() {
    const headerSatiri = document.getElementById("tabloBaslikSatiri");
    if (!headerSatiri) return;
    headerSatiri.innerHTML = '<th class="sticky-col">Personel Bilgisi & Departman</th>';
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);
    const gunAdlari = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

    for (let g = 1; g <= toplamGun; g++) {
        const d = new Date(mevcutYil, mevcutAy, g);
        const th = document.createElement("th");
        th.className = (d.getDay() === 0 || d.getDay() === 6) ? "day-th weekend" : "day-th";
        th.innerHTML = `${g}<span>${gunAdlari[d.getDay()]}</span>`;
        headerSatiri.appendChild(th);
    }
}

function görevFiltrele(görevTürü) {
    mevcutFiltre = görevTürü;
    
    // Aktif buton görsel efekti yönetimi
    document.getElementById("btn-filtre-hepsi").classList.remove("active");
    document.getElementById("btn-filtre-uretim").classList.remove("active");
    document.getElementById("btn-filtre-garson").classList.remove("active");
    document.getElementById("btn-filtre-depo").classList.remove("active");

    if (görevTürü === "HEPSİ") document.getElementById("btn-filtre-hepsi").classList.add("active");
    else if (görevTürü === "Üretim Personeli") document.getElementById("btn-filtre-uretim").classList.add("active");
    else if (görevTürü === "Garson") document.getElementById("btn-filtre-garson").classList.add("active");
    else if (görevTürü === "Depo Personeli") document.getElementById("btn-filtre-depo").classList.add("active");

    document.getElementById("panelAnaBaslik").innerText = görevTürü === "HEPSİ" ? "Aylık Personel Puantaj Paneli" : `${görevTürü} Puantaj Paneli`;
    tabloyuCiz();
}

function tabloyuCiz() {
    const tbody = document.querySelector("#anaTablo tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const donemKey = `${mevcutYil}-${mevcutAy}`;
    let filtrelenmişList = otomasyonVerisi.filter(p => p.donem === donemKey);
    if (mevcutFiltre !== "HEPSİ") filtrelenmişList = filtrelenmişList.filter(p => p.grup === mevcutFiltre);

    raporlariGuncelle(filtrelenmişList);
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);

    filtrelenmişList.forEach(per => {
        const tr = document.createElement("tr");
        const tdBilgi = document.createElement("td");
        tdBilgi.className = "sticky-col";

        let toplamFM = 0;
        if (per.gunler) {
            Object.values(per.gunler).forEach(g => { if (g.durum === "GELDI") toplamFM += (parseInt(g.fazlaMesai) || 0); });
        }

        tdBilgi.innerHTML = `
            <div class="personnel-cell-wrapper">
                <div class="personnel-info">
                    <div style="font-weight:700; color:var(--text-dark); font-size:0.95rem;">${per.ad}</div>
                    <div style='color:var(--text-muted); font-size:0.75rem; font-weight:600; margin-top:2px;'>${per.grup}</div>
                </div>
                <div class="total-hours-badge" onclick="personelMesaiDetayAc(${per.id})" title="Tarihsel Mesai Detayını Göster">
                    +${toplamFM} Sa
                </div>
                <div class="cell-actions">
                    <button onclick="personelSil(${per.id})" class="btn-per-delete" title="Personeli Sil"><i class="fa-solid fa-user-xmark"></i></button>
                </div>
            </div>
        `;
        tr.appendChild(tdBilgi);

        for (let g = 1; g <= toplamGun; g++) {
            const d = new Date(mevcutYil, mevcutAy, g);
            const tdGun = document.createElement("td");
            if (d.getDay() === 0 || d.getDay() === 6) tdGun.className = "weekend";

            const gunVerisi = (per.gunler && per.gunler[g]) ? per.gunler[g] : { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
            const btn = document.createElement("button");
            btn.className = `day-btn ${gunVerisi.durum}`;

            if (gunVerisi.durum === "GELDI") btn.innerText = "G";
            else if (gunVerisi.durum === "GELMEDI") btn.innerText = "YOK";
            else if (gunVerisi.durum === "RAPOR") btn.innerText = "R";
            else btn.innerText = "-";

            btn.onclick = () => chefDüzenlemeModaliAc(per.id, g, gunVerisi);
            tdGun.appendChild(btn);
            tr.appendChild(tdGun);
        }
        tbody.appendChild(tr);
    });
}

function chefDüzenlemeModaliAc(perId, gun, veri) {
    seciliPersonelId = perId;
    seciliGun = gun;
    document.getElementById("modalBaslik").innerText = `${gun}. Gün Durum Değişikliği`;
    document.getElementById("modalDurum").value = veri.durum || "BOS";
    document.getElementById("modalNormalMesai").value = veri.durum === "BOS" ? 9 : (veri.normalMesai || 9);
    document.getElementById("modalFazlaMesai").value = veri.fazlaMesai || 0;
    durumDegisti(veri.durum || "BOS");
    document.getElementById("chefModal").style.display = "block";
}

function durumDegisti(durum) {
    const nAlani = document.getElementById("normalMesaiAlani");
    const fAlani = document.getElementById("fazlaMesaiAlani");
    if (durum === "GELDI") { nAlani.style.display = "flex"; fAlani.style.display = "flex"; }
    else { nAlani.style.display = "none"; fAlani.style.display = "none"; }
}

function gunlukVeriKaydet() {
    const yeniDurum = document.getElementById("modalDurum").value;
    let yeniNormal = parseInt(document.getElementById("modalNormalMesai").value) || 0;
    let yeniFazla = parseInt(document.getElementById("modalFazlaMesai").value) || 0;

    const per = otomasyonVerisi.find(p => p.id === seciliPersonelId);
    if (per) {
        if (!per.gunler) per.gunler = {};
        
        const eskiVeri = per.gunler[seciliGun] || { durum: "BOS", normalMesai: 0, fazlaMesai: 0 };
        const eskiToplamFM = parseInt(eskiVeri.fazlaMesai) || 0;

        // Eğer fazla mesai saatinde bir değişim varsa denetim günlüğüne log gönderiyoruz
        if (eskiToplamFM !== yeniFazla && yeniDurum === "GELDI") {
            const simdi = new Date();
            const logId = Date.now();
            const logKaydi = {
                id: logId,
                tarih: simdi.toLocaleDateString('tr-TR'),
                saat: simdi.toLocaleTimeString('tr-TR'),
                personel: per.ad,
                gun: seciliGun,
                eskiMesai: eskiToplamFM,
                yeniMesai: yeniFazla
            };
            window.firebaseSet(window.ref(window.db, 'loglar/' + logId), logKaydi);
        }

        if (yeniDurum !== "GELDI") { yeniNormal = 0; yeniFazla = 0; }
        per.gunler[seciliGun] = { durum: yeniDurum, normalMesai: yeniNormal, fazlaMesai: yeniFazla };
        
        window.firebaseSet(window.firebaseRef(window.db, 'puantaj/' + per.id), per);
    }
    modalKapat();
}

// ARANAN ÖZEL ÖZELLİK: ROZETE TIKLANINCA TARİH TARİH MESAİLERİ DÖKEN SİHİRLİ MOTOR
function personelMesaiDetayAc(id) {
    const per = otomasyonVerisi.find(p => p.id === id);
    if (!per) return;

    document.getElementById("mesaiDetayBaslik").innerText = `${per.ad} - Fazla Mesai Geçmişi`;
    const listeYüzeyi = document.getElementById("mesaiDetayListesi");
    listeYüzeyi.innerHTML = "";

    let kayitVarMi = false;
    const ayFormatli = (mevcutAy + 1).toString().padStart(2, '0');

    if (per.gunler) {
        Object.keys(per.gunler).forEach(gun => {
            const veri = per.gunler[gun];
            if (veri.durum === "GELDI" && (parseInt(veri.fazlaMesai) || 0) > 0) {
                kayitVarMi = true;
                const item = document.createElement("div");
                item.className = "log-item";
                item.style.borderLeftColor = "#10b981"; // Başarılı yeşil şerit çizgisi
                item.innerHTML = `
                    <span class="log-time"><i class="fa-solid fa-calendar-day"></i> ${gun.padStart(2, '0')}.${ayFormatli}.${mevcutYil}</span>
                    <div class="log-text">
                        Normal Çalışma: <strong>${veri.normalMesai || 9} Saat</strong><br>
                        Fazla Mesai: <span class="log-badge" style="color:#10b981; font-weight:700;">+${veri.fazlaMesai} Saat</span>
                    </div>
                `;
                listeYüzeyi.appendChild(item);
            }
        });
    }

    if (!kayitVarMi) {
        listeYüzeyi.innerHTML = `<p style='text-align:center; padding:25px; color:#94a3b8; font-size:0.85rem;'><i class="fa-solid fa-circle-info"></i> Bu personele ait bu çalışma döneminde fazla mesai kaydı bulunmamaktadır.</p>`;
    }

    document.getElementById("mesaiDetayModal").style.display = "block";
}

function personelEkle() {
    const adInput = document.getElementById("perAdSoyad");
    const ad = adInput.value.trim();
    const grup = document.getElementById("perGrup").value;
    if (!ad) { alert("Lütfen personel isim bilgisini giriniz!"); return; }

    const perId = Date.now();
    const yeniPersonel = { id: perId, ad: ad, grup: grup, donem: `${mevcutYil}-${mevcutAy}`, gunler: {} };
    const toplamGun = ayinGunSayisi(mevcutYil, mevcutAy);
    
    for (let i = 1; i <= toplamGun; i++) { yeniPersonel.gunler[i] = { durum: "BOS", normalMesai: 0, fazlaMesai: 0 }; }

    window.firebaseSet(window.firebaseRef(window.db, 'puantaj/' + perId), yeniPersonel);
    adInput.value = "";
}

function personelSil(id) {
    if (confirm("Seçili personeli sistemden tamamen kaldırmak istediğinize emin misiniz?")) {
        window.firebaseSet(window.firebaseRef(window.db, 'puantaj/' + id), null);
    }
}

function raporlariGuncelle(filtrelenmişList) {
    let toplamFM = 0; let toplamG = 0; let toplamR = 0;
    filtrelenmişList.forEach(per => {
        if (per.gunler) {
            Object.values(per.gunler).forEach(g => {
                if (g.durum === "GELDI") { toplamG++; toplamFM += (parseInt(g.fazlaMesai) || 0); }
                else if (g.durum === "RAPOR") toplamR++;
            });
        }
    });
    document.getElementById("repTotalFM").innerText = `${toplamFM} Saat`;
    document.getElementById("repTotalG").innerText = `${toplamG} Gün`;
    document.getElementById("repTotalR").innerText = `${toplamR} Gün`;
}

function logModalAc() {
    const logListesi = document.getElementById("logListesi");
    if (!logListesi) return;
    logListesi.innerHTML = "";
    
    if (sistemLoglari.length === 0) { logListesi.innerHTML = "<p style='text-align:center; padding:20px; color:#94a3b8;'>Henüz bir hareket kaydı bulunmuyor.</p>"; }
    else {
        sistemLoglari.slice().reverse().forEach(log => {
            const item = document.createElement("div");
            item.className = "log-item";
            item.innerHTML = `<span class="log-time">${log.tarih} | ${log.saat}</span><div class="log-text"><strong>${log.personel}</strong> - ${log.gun}. Gün Fazla Mesaisi Güncellendi: <br><span class="log-badge">${log.eskiMesai} Sa</span> ➔ <span class="log-badge" style="color:#e65c00;">${log.yeniMesai} Sa</span></div>`;
            logListesi.appendChild(item);
        });
    }
    document.getElementById("logModal").style.display = "block";
}

// Kapatma Fonksiyonları
function modalKapat() { document.getElementById("chefModal").style.display = "none"; }
function logModalKapat() { document.getElementById("logModal").style.display = "none"; }
function mesaiDetayModalKapat() { document.getElementById("mesaiDetayModal").style.display = "none"; }

// Pencereleri HTML Butonlarından Tetikleyebilmek İçin Global Alana Çıkarma (Bağlantı Köprüleri)
window.donemDegisti = donemDegisti;
window.görevFiltrele = görevFiltrele;
window.personelEkle = personelEkle;
window.personelSil = personelSil;
window.modalKapat = modalKapat;
window.logModalAc = logModalAc;
window.logModalKapat = logModalKapat;
window.gunlukVeriKaydet = gunlukVeriKaydet;
window.durumDegisti = durumDegisti;
window.personelMesaiDetayAc = personelMesaiDetayAc;
window.mesaiDetayModalKapat = mesaiDetayModalKapat;
