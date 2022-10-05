// cartCout...........................................................
function addToCart(proId) {
  $.ajax({
    url: '/add-to-cart/' + proId,
    method: 'get',
    success: (response) => {
      if (response.status) {
        let count = $('#cartCount').html();
        count = parseInt(count) + 1;
        $('#cartCount').html(count);
        swal('Item add to cart!', 'This item add to cart', 'success');
      }
    },
  });
}

// item Remove form cart  ...........................................................

function itemRemove(cartId, proId) {
  console.log(cartId, proId);
  swal({
    title: 'Are you sure?',
    text: 'Once deleted, you will not be able to recover this item!',
    icon: 'warning',
    buttons: true,
    dangerMode: true,
  }).then((willDelete) => {
    if (willDelete) {
      swal('Poof! Your item has been deleted!', {
        icon: 'success',
        buttons: false,
      });
      setTimeout(cartItemRemove, 1000);
      function cartItemRemove() {
        if (true) {
          $.ajax({
            url: '/remove-item-from-cart',
            data: {
              cart: cartId,
              product: proId,
            },
            method: 'post',

            success: (response) => {
              if (response.removeProduct) {
                location.reload();
              }
            },
          });
        } else {
        }
      }
    } else {
      swal('Your item not removed');
    }
  });
}

/**
 * dataTabile
 */
$(document).ready(function () {
  $('#dataTabile').DataTable();
});
