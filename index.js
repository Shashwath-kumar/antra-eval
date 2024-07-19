const API = (() => {
  const URL = "http://localhost:3000";
  const getCart = () => {
    // define your method to get cart data
    return fetch(`${URL}/cart`).then(response => response.json());
  };

  const getInventory = () => {
    // define your method to get inventory data
    return fetch(`${URL}/inventory`).then(response => response.json());
  };

  const addToCart = (inventoryItem) => {
    // define your method to add an item to cart
    return fetch(`${URL}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inventoryItem)
    }).then(response => response.json());
  };

  const updateCart = (id, newAmount) => {
    // define your method to update an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: newAmount })
    }).then(response => response.json());
  };

  const deleteFromCart = (id) => {
    // define your method to delete an item in cart
    return fetch(`${URL}/cart/${id}`, {
      method: 'DELETE'
    }).then(response => response.json());
  };

  const checkout = () => {
    // you don't need to add anything here
    return getCart().then((data) =>
      Promise.all(data.map((item) => deleteFromCart(item.id)))
    );
  };

  return {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  };
})();

const Model = (() => {
  // implement your logic for Model
  class State {
    #onChange;
    #inventory;
    #cart;
    constructor() {
      this.#inventory = [];
      this.#cart = [];
    }
    get cart() {
      return this.#cart;
    }

    get inventory() {
      return this.#inventory;
    }

    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange();
    }
    set inventory(newInventory) {
      this.#inventory = newInventory;
      this.#onChange();
    }

    subscribe(cb) {
      this.#onChange = cb;
    }
  }
  const {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  } = API;
  return {
    State,
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  };
})();

const View = (() => {
  const inventoryList = document.querySelector('.inventory-container ul');
  const cartList = document.querySelector('.cart-container ul');
  const renderInventory = (inventory, handleUpdateAmount, handleAddToCart) => {
    inventoryList.innerHTML = inventory.map(item => `
      <li>
        <span class="name">${item.content}</span>
        <button class="decrease">-</button>
        <span class="amount">${item.amount || 0}</span>
        <button class="increase">+</button>
        <button class="add-to-cart">add to cart</button>
      </li>
    `).join('');

  };

  const renderCart = (cart, handleDelete) => {
    cartList.innerHTML = cart.map(item => `
      <li>
        <span class="name">${item.content} x ${item.amount}</span>
        <button class="delete">delete</button>
      </li>
    `).join('');

  };

  return {
    renderInventory,
    renderCart,
    inventoryList,
    cartList
  };
})();

const Controller = ((model, view) => {
  // implement your logic for Controller
  const state = new model.State();

  const setUpHandlers = () => {
    view.inventoryList.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      // console.log(li.innerHTML);
      if (!li) return;
      
      const itemContent = li.querySelector('span').textContent;
      
      if (e.target.classList.contains('decrease')) {
        // console.log('decrase')
        handleUpdateAmount(itemContent, -1);
      } else if (e.target.classList.contains('increase')) {
        // console.log('increase')
        handleUpdateAmount(itemContent, 1);
      } else if (e.target.classList.contains('add-to-cart')) {
        // console.log('add to cart')
        handleAddToCart(itemContent);
      }
    });


    view.cartList.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete')) {
        const li = e.target.closest('li');
        if (!li) return;
        
        const itemContent = li.querySelector('span').textContent.split(' x ')[0];
        // console.log(itemContent)
        handleDelete(itemContent);
      }
    });
  };

  const init = () => {
    model.getInventory().then(inventory => {
      state.inventory = inventory.map(item => ({ ...item, amount: 0 }));
    });
    model.getCart().then(cart => {
      state.cart = cart;
    });
    setUpHandlers();
  };
  const handleUpdateAmount = (itemContent, change) => {
    const inventory = [...state.inventory];
    const itemIndex = inventory.findIndex(item => item.content === itemContent);
    if (itemIndex !== -1) {
      // console.log(change)
      inventory[itemIndex].amount = Math.max(0, (inventory[itemIndex].amount || 0) + change);
      state.inventory = inventory;
    }
  };

  const handleAddToCart = (itemContent) => {
    const item = state.inventory.find(invItem => invItem.content === itemContent);
    if (item && item.amount > 0) {
      const existingCartItem = state.cart.find(cartItem => cartItem.content === item.content);
      if (existingCartItem) {
        model.updateCart(existingCartItem.id, existingCartItem.amount + item.amount)
          .then(() => model.getCart())
          .then(cart => {
            state.cart = cart;
          });
      } else {
        model.addToCart({ content: item.content, amount: item.amount })
          .then(() => model.getCart())
          .then(cart => {
            state.cart = cart;
          });
      }
      // handleUpdateAmount(itemContent, -item.amount);
    }
  };

  const handleDelete = (itemContent) => {
    const cartItem = state.cart.find(item => item.content === itemContent);
    if (cartItem) {
      model.deleteFromCart(cartItem.id)
        .then(() => model.getCart())
        .then(cart => {
          state.cart = cart;
        });
    }
  };

  const handleCheckout = () => {
    model.checkout()
      .then(() => {
        state.cart = [];
      });
  };
  const bootstrap = () => {
    state.subscribe(() => {
      view.renderInventory(state.inventory, handleUpdateAmount, handleAddToCart);
      view.renderCart(state.cart, handleDelete);
    });
    init();
    document.querySelector('.checkout-btn').addEventListener('click', handleCheckout);
   };
  return {
    bootstrap,
  };
})(Model, View);

Controller.bootstrap();