import { useRef } from 'react'

const ContactsSection = () => {
  const contactsSectionRef = useRef(null)
  const contactsWrapperRef = useRef(null)
  const contactsGridRef = useRef(null)

  return (
    <section id="contacts" ref={contactsSectionRef} className="section-contacts" style={{ minHeight: '90vh' }}>
      <div className="padding-global">
        <div className="container-large">
          <div className="contacts flex items-center justify-center" style={{ minHeight: '90vh' }}>
            <div className="contacts-content flex flex-col gap-[24px] items-center" style={{ paddingTop: '56px', paddingBottom: '56px' }}>
              {/* Contacts Wrapper */}
              <div ref={contactsWrapperRef} className="contacts-wrapper flex flex-col gap-[20px] items-center">
                <p className="contacts-intro" style={{ fontFamily: 'Commissioner', fontSize: '14px', fontWeight: 450, textTransform: 'uppercase', color: '#363636', margin: 0, textAlign: 'center' }}>
                  по всем интересующим вопросам, пишите или звонте нам:
                </p>
                <a 
                  href="mailto:info@ratco.ru" 
                  className="contacts-email" 
                  style={{ fontFamily: 'Commissioner', fontSize: '64px', fontWeight: 500, letterSpacing: '-0.04em', lineHeight: '1', margin: 0, textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'opacity 0.3s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <span style={{ color: '#A9A9A9', textTransform: 'uppercase', letterSpacing: '0.1px' }}>info@ratco.ru</span>
                </a>
                <a 
                  href="tel:+78002509468" 
                  className="contacts-phone" 
                  style={{ fontFamily: 'Commissioner', fontSize: '64px', fontWeight: 500, letterSpacing: '-0.04em', lineHeight: '1', margin: 0, textDecoration: 'none', color: 'inherit', cursor: 'pointer', transition: 'opacity 0.3s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <span style={{ color: '#A9A9A9' }}>8 (800) 250‒94‒68</span>
                </a>
              </div>

              {/* Grid: 3 колонки */}
              <div ref={contactsGridRef} className="contacts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 376px 1fr', gap: '86px' }}>
                {/* Первая колонка - пустая */}
                <div></div>

                {/* Вторая колонка - изображение */}
                <div className="contacts-image-wrapper">
                  <img 
                    src="/contacts-img.png" 
                    alt="Контакты" 
                    style={{ width: '376px', height: '376px', objectFit: 'cover' }}
                  />
                </div>

                {/* Третья колонка - адрес */}
                <div className="address flex flex-col gap-[24px] self-center md:max-w-[340px]" style={{ alignItems: 'flex-start' }}>
                  {/* Первый блок адреса */}
                  <div className="address-block flex flex-col gap-[8px]">
                    <p className="product-type" style={{ margin: 0 }}>адрес:</p>
                    <p style={{ fontFamily: 'Commissioner', fontSize: '15px', fontWeight: 400, color: '#363636', margin: 0, lineHeight: '1.6' }}>
                      Шоурум<br />
                      Бизнес-центр "Обнинский", Киевское шоссе д. 11-б, офис 204, г. Обнинск, Россия
                    </p>
                  </div>

                  {/* Второй блок - представительство */}
                  <div className="address-block flex flex-col gap-[8px]">
                    <p className="product-type" style={{ margin: 0 }}>представительство в москве:</p>
                    <p style={{ fontFamily: 'Commissioner', fontSize: '15px', fontWeight: 400, color: '#363636', margin: 0, lineHeight: '1.6' }}>
                      8 (495) 660-94-68
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ContactsSection
