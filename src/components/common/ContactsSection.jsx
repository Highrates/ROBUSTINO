import { useRef } from 'react'

const ContactsSection = () => {
  const contactsSectionRef = useRef(null)
  const contactsWrapperRef = useRef(null)
  const contactsGridRef = useRef(null)

  const openSiteChat = (e) => {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('robustino-open-site-chat'))
  }

  return (
    <section id="contacts" ref={contactsSectionRef} className="section-contacts">
      <div className="padding-global">
        <div className="container-large">
          <div className="contacts">
            <div className="contacts-content">
              {/* Contacts Wrapper */}
              <div ref={contactsWrapperRef} className="contacts-wrapper">
                <p className="contacts-intro">
                  по всем интересующим вопросам, пишите или звонте нам:
                </p>
                <a href="mailto:info@ratco.ru" className="contacts-email">
                  <span className="contacts-email-text">info@ratco.ru</span>
                </a>
                <a href="tel:+78002509468" className="contacts-phone">
                  <span>8 (800) 250‒94‒68</span>
                </a>
                <button type="button" className="contacts-chat-cta" onClick={openSiteChat}>
                  Написать
                </button>
              </div>

              <div ref={contactsGridRef} className="contacts-grid">
                <div className="contacts-image-wrapper">
                  <img
                    src="/about-pic3.png"
                    alt="Контакты"
                    className="contacts-image"
                  />
                </div>

                <div className="contacts-address address">
                  <div className="address-block">
                    <p className="product-type">адрес:</p>
                    <p className="contacts-address-text">
                      Центральный Шоурум продукции Фабрики Робустино,<br />
                      г. Обнинск Киевское шоссе 11Б, Россия
                    </p>
                  </div>

                  <div className="address-block">
                    <p className="product-type">представительство в москве:</p>
                    <p className="contacts-moscow-phone">8 (495) 660-94-68</p>
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
